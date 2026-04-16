/**
 * GET /api/crypto/public-key
 *
 * Generate and return a session-specific RSA public key for secure data transfer.
 * The public key is used by the client to encrypt sensitive data before transmission.
 */

export default defineEventHandler(async event => {
  const session = await requireAuthSession(event)

  // Use session ID as the key pair identifier
  const sessionId = session.user.id
  const publicKey = generateServerKeyPair(sessionId)

  return {
    publicKey,
  }
})
