import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

/**
 * POST /api/wallets
 *
 * Create a new wallet with counterfactual deployment.
 * Generates a new private key and computes the Safe address without deploying.
 * Wallet is created with INACTIVE status.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  // Validate subscription limit first
  await validateWalletCount(user.id)

  const body = await readBody(event)
  const { name } = validateRequestData(body, 'POST', '/api/wallets')

  // Generate new private key and derive owner address
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  // Compute Safe address without deploying (counterfactual deployment)
  let safeAddress: string
  try {
    safeAddress = await getSafeAddress(account.address)
  } catch (error) {
    console.error('Safe address computation failed:', error)
    throwApiError(500, ERROR_CODES.WALLET_CREATION_FAILED)
  }

  // Check if wallet already exists (extremely rare: private key collision)
  await validateWalletNotExists(safeAddress, user.id)

  // Encrypt and store the private key
  const encryptedKey = encrypt(privateKey)

  // Create wallet record with INACTIVE status
  const wallet = await db.wallet.create({
    data: {
      funder: safeAddress,
      name,
      encryptedKey,
      ownerId: user.id,
      status: WalletStatus.INACTIVE,
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
