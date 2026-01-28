/**
 * Polymarket Safe Wallet Utility
 *
 * Features: Safe address computation, deployment status check, Safe wallet deployment, enable trading
 * Documentation: https://docs.polymarket.com/developers/proxy-wallet
 */

import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  erc1155Abi,
  getAddress,
  getCreate2Address,
  http,
  keccak256,
  maxUint256,
} from 'viem'
import type { Address, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon } from 'viem/chains'
import type { RelayerTransaction } from '@polymarket/builder-relayer-client'
import { OperationType } from '@polymarket/builder-relayer-client'
import { createRelayerClient } from '@polymarbot/shared/relayer-client'

// ============================================================================
// Constants
// ============================================================================

const POLYGON_RPC = 'https://polygon-rpc.com'
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
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC),
  })

  return await publicClient.readContract({
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
        to: USDC_ADDRESS,
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
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC),
  })

  const details: ExchangeApprovalStatus[] = []

  for (const exchange of EXCHANGE_ADDRESSES) {
    // Check USDC allowance
    const usdcAllowance = await publicClient.readContract({
      address: USDC_ADDRESS,
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
 * Approve tokens for trading (gasless via Relayer)
 *
 * Executes USDC and CTF approvals only for unapproved Polymarket exchange contracts.
 * This is the "Approve Tokens" step in the Enable Trading flow.
 *
 * @param privateKey - User wallet private key
 * @param approvalStatus - Current approval status (from checkTradingApprovals)
 * @returns Transaction result, or undefined if no approvals needed
 * @throws Throws an error if Safe is not deployed or approval fails
 */
export async function approveTokensForTrading (
  privateKey: Hex,
  approvalStatus: ExchangeApprovalStatus[],
): Promise<RelayerTransaction | undefined> {
  const transactions = buildApprovalTransactions(approvalStatus)

  // No pending approvals
  if (transactions.length === 0) {
    return undefined
  }

  const relayerClient = createRelayerClient(privateKey)
  const response = await relayerClient.execute(transactions, 'Enable Trading - Approve Tokens')
  const result = await response.wait()

  if (!result) {
    throw new Error('Token approval failed')
  }

  return result
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
  approvalTransaction?: RelayerTransaction
}> {
  // Step 1: Deploy or get Safe wallet
  const { safeAddress, isNewDeployment, transaction: deployTransaction }
    = await deployOrGetSafeWallet(privateKey)

  // Step 2: Check existing approvals
  const { allApproved, details } = await checkTradingApprovals(safeAddress)

  // Step 3: Approve only unapproved tokens
  let approvalTransaction: RelayerTransaction | undefined
  if (!allApproved) {
    approvalTransaction = await approveTokensForTrading(privateKey, details)
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
 * Withdraw USDC from Safe wallet to a recipient address (gasless via Relayer)
 *
 * Executes an ERC20 transfer from the Safe wallet to the specified recipient.
 * The transaction is signed by the owner but gas is paid by Polymarket Relayer.
 *
 * Note: This function does NOT wait for the transaction to be mined.
 * It returns immediately after the relayer accepts the transaction.
 *
 * @param privateKey - Owner's private key
 * @param toAddress - Recipient address on Polygon
 * @param amount - Amount to withdraw in raw units (6 decimals for USDC)
 * @returns Transaction ID and hash for tracking
 * @throws Throws an error if Safe is not deployed or transfer fails
 */
export async function withdrawUsdc (
  privateKey: Hex,
  toAddress: Address,
  amount: bigint,
): Promise<{ transactionId: string, transactionHash: string }> {
  const relayerClient = createRelayerClient(privateKey)

  const transaction = {
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [ toAddress, amount ],
    }),
    value: '0',
    operation: OperationType.Call,
  }

  const response = await relayerClient.execute([ transaction ], 'Withdraw USDC')

  // Return transaction info without waiting for confirmation
  return {
    transactionId: response.transactionID,
    transactionHash: response.transactionHash,
  }
}
