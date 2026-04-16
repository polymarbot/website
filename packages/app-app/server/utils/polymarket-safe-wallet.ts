/**
 * Polymarket Safe Wallet Utility
 *
 * Features: Safe address computation, deployment status check, Safe wallet deployment, enable trading
 * Documentation: https://docs.polymarket.com/developers/proxy-wallet
 */

import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  erc1155Abi,
  getAddress,
  getCreate2Address,
  keccak256,
  maxUint256, parseAbi,
} from 'viem'
import type { Address, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { RelayerTransaction } from '@polymarket/builder-relayer-client'
import { OperationType, TransactionType } from '@polymarket/builder-relayer-client'
import { createRelayerClient } from '@polymarbot/shared/relayer-client'
import { execSafeTransaction } from '@polymarbot/shared/safe-executor'
import { getPublicClient } from '@polymarbot/shared/wallet'

// ============================================================================
// Constants
// ============================================================================

const RELAYER_URL = 'https://relayer-v2.polymarket.com/'

/**
 * Conditional Token Framework (CTF) contract address on Polygon
 * ERC1155 token that represents market positions
 * @see https://polygonscan.com/address/0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
 */
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045' as const

/**
 * Polymarket exchange contract addresses that need token approvals
 *
 * Before trading, users must approve USDC and CTF tokens for these 3 contracts:
 * - CTF Exchange: Main exchange for standard markets
 * - Neg Risk CTF Exchange: Exchange for negative risk markets
 * - Neg Risk Adapter: Adapter for negative risk market operations
 *
 * @see https://docs.polymarket.com/developers/proxy-wallet
 * @see https://github.com/Polymarket/py-clob-client
 * @see https://gist.github.com/poly-rodr/44313920481de58d5a3f6d1f8226bd5e
 */
const EXCHANGE_ADDRESSES = [
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // CTF Exchange
  '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Neg Risk CTF Exchange
  '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296', // Neg Risk Adapter
] as const

/**
 * Polymarket Safe Proxy Factory address on Polygon
 * @see https://docs.polymarket.com/developers/proxy-wallet
 * @see https://polygonscan.com/address/0xaacfeea03eb1561c4e67d661e40682bd20e3541b
 */
const SAFE_FACTORY_ADDRESS = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b' as const

/**
 * Safe Proxy init code hash for CREATE2 address computation
 *
 * Value = keccak256(getContractBytecode())
 * where getContractBytecode() = abi.encodePacked(proxyCreationCode(), abi.encode(masterCopy))
 *
 * @deprecated Used only by computeSafeAddress(). Prefer getSafeAddress() which calls on-chain contract.
 * @see https://polygonscan.com/address/0xaacfeea03eb1561c4e67d661e40682bd20e3541b#code
 */
const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf' as const

// ============================================================================
// ABI Definitions
// ============================================================================

const safeAbi = parseAbi([
  'function nonce() view returns (uint256)',
])

const safeFactoryAbi = [
  {
    name: 'computeProxyAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

// ============================================================================
// Relayer Transaction Execution
// ============================================================================

type SafeTransaction = { to: string, data: string, value: string, operation: OperationType }

export type ExecRelayerTransactionResult
  = | { method: 'relayer', transactionHash: string, transaction: RelayerTransaction }
    | { method: 'direct', transactionHash: string }

/**
 * Execute transactions via Polymarket Relayer with direct Safe fallback.
 *
 * Unified entry point for all Safe transaction execution:
 * 1. Pre-check: compare Relayer nonce with on-chain nonce, skip Relayer if desynced
 * 2. Try gasless execution via Polymarket Relayer
 * 3. On 429 quota error, fall back to direct Safe transaction (requires GAS_PAYER_PRIVATE_KEY)
 *
 * @param privateKey - Owner's private key (Safe owner)
 * @param safeAddress - Safe wallet address
 * @param transactions - Transactions to execute
 * @param description - Human-readable description for the relayer
 * @param waitForConfirmation - Whether to wait for on-chain confirmation (default: true)
 */
export async function execRelayerTransaction (
  privateKey: Hex,
  safeAddress: Address,
  transactions: SafeTransaction[],
  description: string,
  waitForConfirmation = true,
): Promise<ExecRelayerTransactionResult> {
  const relayerClient = createRelayerClient(privateKey)

  // Pre-check: compare Relayer nonce with on-chain nonce to avoid GS026
  const nonceSynced = await isRelayerNonceSynced(relayerClient, safeAddress)
  if (!nonceSynced) {
    console.warn(`⚠️ Relayer nonce out of sync, using direct Safe transaction for: ${description}`)
    return await execDirectSafeTransaction(privateKey, safeAddress, transactions, description, waitForConfirmation)
  }

  try {
    const response = await relayerClient.execute(transactions, description)

    if (waitForConfirmation) {
      const result = await response.wait()
      if (!result) {
        // Relayer transaction failed on-chain, fall back to direct execution
        return await execDirectSafeTransaction(privateKey, safeAddress, transactions, description, waitForConfirmation)
      }
      return { method: 'relayer', transactionHash: result.transactionHash, transaction: result }
    }

    // Not waiting: build a partial RelayerTransaction from response
    return {
      method: 'relayer',
      transactionHash: response.transactionHash,
      transaction: {
        transactionID: response.transactionID,
        transactionHash: response.transactionHash,
        state: response.state,
      } as RelayerTransaction,
    }
  } catch (error) {
    if (!isQuotaExhaustedError(error)) {
      throw error
    }

    console.warn(`⚠️ Relayer quota exceeded (429), falling back to direct Safe transaction for: ${description}`)
    return await execDirectSafeTransaction(privateKey, safeAddress, transactions, description, waitForConfirmation)
  }
}

/**
 * Compare Relayer nonce with on-chain Safe nonce.
 * Returns true if they match (safe to use Relayer), false if desynced.
 */
async function isRelayerNonceSynced (
  relayerClient: ReturnType<typeof createRelayerClient>,
  safeAddress: Address,
): Promise<boolean> {
  try {
    const signerAddress = await relayerClient.signer!.getAddress()
    const [ relayerNoncePayload, onChainNonce ] = await Promise.all([
      relayerClient.getNonce(signerAddress, TransactionType.SAFE),
      getPublicClient().readContract({
        address: safeAddress,
        abi: safeAbi,
        functionName: 'nonce',
      }),
    ])
    const relayerNonce = BigInt(relayerNoncePayload.nonce)
    return relayerNonce === onChainNonce
  } catch (error) {
    // If nonce check fails, proceed with Relayer anyway
    console.error('Failed to check nonce sync:', error)
    return true
  }
}

/**
 * Execute transaction directly via Safe contract (reads nonce from chain).
 * Used as fallback when Relayer is unavailable (429) or its nonce is out of sync (GS026).
 */
async function execDirectSafeTransaction (
  privateKey: Hex,
  safeAddress: Address,
  transactions: SafeTransaction[],
  description: string,
  waitForConfirmation: boolean,
): Promise<ExecRelayerTransactionResult> {
  const gasPayerPrivateKey = process.env.GAS_PAYER_PRIVATE_KEY as Hex
  if (!gasPayerPrivateKey) {
    throw new Error('GAS_PAYER_PRIVATE_KEY environment variable is not configured')
  }

  console.warn(`⚠️ Falling back to direct Safe transaction for: ${description}`)

  const txHash = await execSafeTransaction({
    safeAddress,
    ownerPrivateKey: privateKey,
    gasPayerPrivateKey,
    transactions,
  })

  // Wait for on-chain confirmation to prevent in-flight transaction limit errors
  if (waitForConfirmation) {
    await getPublicClient().waitForTransactionReceipt({ hash: txHash })
  }

  return { method: 'direct', transactionHash: txHash }
}

/**
 * Check if an error is a quota exhausted error (HTTP 429)
 */
function isQuotaExhaustedError (error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('429') || message.includes('quota exceeded') || message.includes('too many requests')) {
      return true
    }
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status: number }).status === 429
  }
  return false
}

// ============================================================================
// Safe Address Computation
// ============================================================================

/**
 * Calculate Safe Wallet address using CREATE2 (local computation)
 *
 * @deprecated Use getSafeAddress() instead, which calls the on-chain contract for accuracy
 * @param ownerAddress - Owner address
 * @returns Safe Wallet address
 */
export function computeSafeAddress (ownerAddress: Address): Address {
  const salt = keccak256(
    encodeAbiParameters(
      [{ name: 'address', type: 'address' }],
      [ ownerAddress ],
    ),
  )

  return getCreate2Address({
    bytecodeHash: SAFE_INIT_CODE_HASH,
    from: SAFE_FACTORY_ADDRESS,
    salt,
  })
}

/**
 * Get the expected Safe Wallet address by calling on-chain contract
 *
 * Queries the Safe Factory contract to compute the deterministic proxy address.
 * This ensures the address calculation always matches the official implementation.
 *
 * @param ownerAddress - Owner address
 * @returns Expected Safe Wallet address
 */
export async function getSafeAddress (ownerAddress: Address): Promise<Address> {
  return await getPublicClient().readContract({
    address: SAFE_FACTORY_ADDRESS,
    abi: safeFactoryAbi,
    functionName: 'computeProxyAddress',
    args: [ ownerAddress ],
  })
}

// ============================================================================
// Safe Wallet Operations
// ============================================================================

/**
 * Check if Safe Wallet is already deployed
 *
 * @param safeAddress - Safe Wallet address to check
 * @returns Whether the Safe contract is deployed
 */
export async function checkSafeWalletDeployed (safeAddress: Address): Promise<boolean> {
  const response = await fetch(`${RELAYER_URL}deployed?address=${safeAddress}`)
  const data = await response.json() as { deployed: boolean }
  return data.deployed
}

/**
 * Deploy Safe Wallet (gasless)
 *
 * @param privateKey - User wallet private key
 * @returns Safe Wallet deployment result
 * @throws Throws an error if deployment fails or Safe is already deployed
 */
export async function deploySafeWallet (privateKey: Hex): Promise<RelayerTransaction> {
  const relayerClient = createRelayerClient(privateKey)
  const response = await relayerClient.deploy()
  const result = await response.wait()

  if (!result) {
    throw new Error('Safe Wallet deployment failed')
  }

  return result
}

/**
 * Deploy or get Safe Wallet (recommended)
 *
 * If deployed: returns address info | If not deployed: executes deployment and returns transaction info
 *
 * @param privateKey - User wallet private key
 * @returns Safe Wallet info (including isNewDeployment flag)
 */
export async function deployOrGetSafeWallet (privateKey: Hex): Promise<{
  safeAddress: Address
  isNewDeployment: boolean
  transaction?: RelayerTransaction
}> {
  const account = privateKeyToAccount(privateKey)
  const safeAddress = await getSafeAddress(account.address)
  const deployed = await checkSafeWalletDeployed(safeAddress)

  if (deployed) {
    return {
      safeAddress,
      isNewDeployment: false,
    }
  }

  const transaction = await deploySafeWallet(privateKey)

  return {
    safeAddress: transaction.proxyAddress
      ? getAddress(transaction.proxyAddress as Address)
      : safeAddress,
    isNewDeployment: true,
    transaction,
  }
}

// ============================================================================
// Enable Trading (Token Approvals)
// ============================================================================

/**
 * Approval status for a single exchange
 */
interface ExchangeApprovalStatus {
  exchange: Address
  usdcApproved: boolean
  ctfApproved: boolean
}

/**
 * Build approval transactions for trading (only for unapproved items)
 *
 * @param approvalStatus - Current approval status from checkTradingApprovals
 * @returns Array of SafeTransaction for pending token approvals
 */
function buildApprovalTransactions (approvalStatus: ExchangeApprovalStatus[]) {
  const transactions: Array<{
    to: string
    operation: OperationType
    data: string
    value: string
  }> = []

  for (const status of approvalStatus) {
    // USDC ERC20 approve (only if not already approved)
    if (!status.usdcApproved) {
      transactions.push({
        to: USDCE_ADDRESS,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [ status.exchange, maxUint256 ],
        }),
        value: '0',
        operation: OperationType.Call,
      })
    }

    // CTF ERC1155 setApprovalForAll (only if not already approved)
    if (!status.ctfApproved) {
      transactions.push({
        to: CTF_ADDRESS,
        data: encodeFunctionData({
          abi: erc1155Abi,
          functionName: 'setApprovalForAll',
          args: [ status.exchange, true ],
        }),
        value: '0',
        operation: OperationType.Call,
      })
    }
  }

  return transactions
}

/**
 * Check token approval status for a Safe wallet
 *
 * @param safeAddress - Safe wallet address to check
 * @returns Approval status for USDC and CTF for each exchange
 */
export async function checkTradingApprovals (safeAddress: Address): Promise<{
  allApproved: boolean
  details: ExchangeApprovalStatus[]
}> {
  const publicClient = getPublicClient()
  const details: ExchangeApprovalStatus[] = []

  for (const exchange of EXCHANGE_ADDRESSES) {
    // Check USDC allowance
    const usdcAllowance = await publicClient.readContract({
      address: USDCE_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ safeAddress, exchange as Address ],
    })

    // Check CTF approval
    const ctfApproved = await publicClient.readContract({
      address: CTF_ADDRESS,
      abi: erc1155Abi,
      functionName: 'isApprovedForAll',
      args: [ safeAddress, exchange as Address ],
    })

    details.push({
      exchange,
      usdcApproved: usdcAllowance > 0n,
      ctfApproved,
    })
  }

  const allApproved = details.every(d => d.usdcApproved && d.ctfApproved)

  return { allApproved, details }
}

/**
 * Approve tokens for trading (gasless via Relayer, with direct Safe fallback on 429)
 *
 * Executes USDC and CTF approvals only for unapproved Polymarket exchange contracts.
 * This is the "Approve Tokens" step in the Enable Trading flow.
 *
 * @param privateKey - User wallet private key
 * @param safeAddress - Safe wallet address (used for direct fallback)
 * @param approvalStatus - Current approval status (from checkTradingApprovals)
 * @returns Transaction result, or undefined if no approvals needed
 * @throws Throws an error if Safe is not deployed or approval fails
 */
export async function approveTokensForTrading (
  privateKey: Hex,
  safeAddress: Address,
  approvalStatus: ExchangeApprovalStatus[],
): Promise<ExecRelayerTransactionResult | undefined> {
  const transactions = buildApprovalTransactions(approvalStatus)

  // No pending approvals
  if (transactions.length === 0) {
    return undefined
  }

  return await execRelayerTransaction(
    privateKey, safeAddress, transactions, 'Enable Trading - Approve Tokens',
  )
}

/**
 * Enable trading for a Safe wallet (complete flow)
 *
 * Performs the full Enable Trading flow:
 * 1. Check/Deploy Safe wallet
 * 2. Check existing approvals
 * 3. If not fully approved, execute only pending token approvals
 *
 * @param privateKey - User wallet private key
 * @returns Enable trading result
 */
export async function enableTrading (privateKey: Hex): Promise<{
  safeAddress: Address
  isNewDeployment: boolean
  deployTransaction?: RelayerTransaction
  approvalTransaction?: ExecRelayerTransactionResult
}> {
  // Step 1: Deploy or get Safe wallet
  const { safeAddress, isNewDeployment, transaction: deployTransaction } = await deployOrGetSafeWallet(privateKey)

  // Step 2: Check existing approvals
  const { allApproved, details } = await checkTradingApprovals(safeAddress)

  // Step 3: Approve only unapproved tokens
  let approvalTransaction: ExecRelayerTransactionResult | undefined
  if (!allApproved) {
    approvalTransaction = await approveTokensForTrading(privateKey, safeAddress, details)
  }

  return {
    safeAddress,
    isNewDeployment,
    deployTransaction,
    approvalTransaction,
  }
}

// ============================================================================
// Withdraw USDC
// ============================================================================

/**
 * Withdraw USDC from Safe wallet to a recipient address (gasless via Relayer, with direct Safe fallback on 429)
 *
 * Executes an ERC20 transfer from the Safe wallet to the specified recipient.
 * The transaction is signed by the owner but gas is paid by Polymarket Relayer.
 * When Relayer quota is exhausted (429), falls back to direct Safe transaction.
 *
 * Note: This function does NOT wait for the transaction to be mined.
 * It returns immediately after the relayer accepts the transaction.
 *
 * @param privateKey - Owner's private key
 * @param safeAddress - Safe wallet address (used for direct fallback)
 * @param toAddress - Recipient address on Polygon
 * @param amount - Amount to withdraw in raw units (6 decimals for USDC)
 * @returns Transaction ID and hash for tracking
 * @throws Throws an error if Safe is not deployed or transfer fails
 */
export async function withdrawUsdc (
  privateKey: Hex,
  safeAddress: Address,
  toAddress: Address,
  amount: bigint,
): Promise<ExecRelayerTransactionResult> {
  const transaction = {
    to: USDCE_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [ toAddress, amount ],
    }),
    value: '0',
    operation: OperationType.Call,
  }

  return await execRelayerTransaction(
    privateKey, safeAddress, [ transaction ], 'Withdraw USDC',
  )
}
