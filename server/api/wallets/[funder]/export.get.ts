/**
 * GET /api/wallets/:funder/export
 *
 * Export wallet private key encrypted with client's public key.
 * Client must provide their RSA public key via query parameter.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const query = getQuery(event)
  const { publicKey: clientPublicKey } = validateRequestData(query, 'GET', '/api/wallets/[funder]/export')

  const wallet = await validateWalletOwnership(funder, user.id)

  // Decrypt private key from storage
  const privateKey = decrypt(wallet.encryptedKey)

  // Encrypt with client's public key for secure transfer
  let encryptedPrivateKey: string
  try {
    encryptedPrivateKey = encryptWithClientKey(clientPublicKey, privateKey)
  } catch (error) {
    console.error('RSA encryption with client key failed:', error)
    throwApiError(400, ERROR_CODES.COMMON_VALIDATION_ERROR)
  }

  return { encryptedPrivateKey }
})
