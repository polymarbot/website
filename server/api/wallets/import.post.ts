import { privateKeyToAccount } from 'viem/accounts'

/**
 * POST /api/wallets/import
 *
 * Import an existing wallet using an RSA-encrypted private key.
 * Computes Safe address without deploying (counterfactual).
 * Rejects if wallet already exists (own or other user's).
 * Only allows importing deleted wallets, rebinding to current user.
 * Wallet is created with INACTIVE status.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  // Validate subscription limit first
  await validateWalletCount(user.id)

  // Read body and decrypt private key first
  const body = await readBody(event)
  const { name, encryptedPrivateKey } = body

  // Decrypt private key
  let privateKey: `0x${string}`
  try {
    privateKey = decryptWithServerKey(user.id, encryptedPrivateKey) as `0x${string}`
    // Clean up the key pair after successful decryption
    deleteKeyPair(user.id)
  } catch (error) {
    console.error('Private key decryption failed:', error)
    throwApiError(400, ERROR_CODES.WALLET_INVALID_PRIVATE_KEY)
  }

  // Validate after decryption to avoid sensitive data in Zod error messages
  validateRequestData({ name, privateKey }, 'POST', '/api/wallets/import')

  // Validate private key format with viem
  let account: ReturnType<typeof privateKeyToAccount>
  try {
    account = privateKeyToAccount(privateKey)
  } catch (error) {
    console.error('Private key format validation failed:', error)
    throwApiError(400, ERROR_CODES.WALLET_INVALID_PRIVATE_KEY)
  }

  // Compute Safe address without deploying (counterfactual)
  let safeAddress: string
  try {
    safeAddress = await getSafeAddress(account.address)
  } catch (error) {
    console.error('Safe address computation failed:', error)
    throwApiError(500, ERROR_CODES.WALLET_CREATION_FAILED)
  }

  // Check if wallet already exists
  await validateWalletNotExists(safeAddress, user.id)

  // Encrypt the private key
  const encryptedKey = encrypt(privateKey)

  // Upsert wallet - bind to current user if new or deleted, set status to INACTIVE
  const wallet = await db.wallet.upsert({
    where: { funder: safeAddress },
    create: {
      funder: safeAddress,
      name,
      encryptedKey,
      ownerId: user.id,
      status: WalletStatus.INACTIVE,
    },
    update: {
      name,
      encryptedKey,
      ownerId: user.id,
      deleted: false,
      status: WalletStatus.INACTIVE,
      createdAt: new Date(),
    },
    select: {
      funder: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return wallet
})
