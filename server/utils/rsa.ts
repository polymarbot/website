/**
 * RSA Encryption Utility for Secure Private Key Transfer (Server-side)
 *
 * Uses Node.js crypto with RSA-OAEP and SHA-256 for encrypting sensitive data.
 * All public keys are transmitted in Base64 format (without PEM headers) for security.
 *
 * Session-based key pairs provide forward secrecy - each session gets a unique key pair.
 */

import crypto from 'node:crypto'

// ============================================================================
// Session Key Management
// ============================================================================

interface KeyPair {
  publicKey: string // PEM format (stored internally)
  privateKey: string // PEM format (stored internally)
  createdAt: number
}

// In-memory store for session key pairs (keyed by session ID)
// TODO: In production, consider using Redis for multi-instance support
const sessionKeyPairs = new Map<string, KeyPair>()

// Key pair TTL: 10 minutes
const KEY_PAIR_TTL = 10 * 60 * 1000

/**
 * Clean up expired key pairs to prevent memory leaks
 */
function cleanupExpiredKeyPairs (): void {
  const now = Date.now()
  for (const [ sessionId, keyPair ] of sessionKeyPairs) {
    if (now - keyPair.createdAt > KEY_PAIR_TTL) {
      sessionKeyPairs.delete(sessionId)
    }
  }
}

/**
 * Get session key pair with expiration check
 */
function getSessionKeyPair (sessionId: string): KeyPair {
  const keyPair = sessionKeyPairs.get(sessionId)

  if (!keyPair) {
    throw new Error('Session key pair not found or expired')
  }

  if (Date.now() - keyPair.createdAt > KEY_PAIR_TTL) {
    sessionKeyPairs.delete(sessionId)
    throw new Error('Session key pair has expired')
  }

  return keyPair
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert Base64 public key to PEM format
 */
function base64ToPemPublicKey (base64Key: string): string {
  return `-----BEGIN PUBLIC KEY-----\n${base64Key}\n-----END PUBLIC KEY-----`
}

/**
 * Convert PEM public key to Base64 format
 */
function pemToBase64PublicKey (pemKey: string): string {
  return pemKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generate a new RSA key pair for a session (for Import flow)
 *
 * @param sessionId - Unique session identifier
 * @returns Public key (Base64) for sending to client
 */
export function generateServerKeyPair (sessionId: string): string {
  cleanupExpiredKeyPairs()

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  sessionKeyPairs.set(sessionId, {
    publicKey,
    privateKey,
    createdAt: Date.now(),
  })

  return pemToBase64PublicKey(publicKey)
}

/**
 * Delete a session's key pair (cleanup after use)
 *
 * @param sessionId - Session identifier
 */
export function deleteKeyPair (sessionId: string): void {
  sessionKeyPairs.delete(sessionId)
}

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Decrypt data using server's private key (for Import flow)
 *
 * @param sessionId - Session identifier
 * @param encryptedData - Base64 encoded encrypted data from client
 * @returns Decrypted plaintext
 */
export function decryptWithServerKey (sessionId: string, encryptedData: string): string {
  const keyPair = getSessionKeyPair(sessionId)

  const decrypted = crypto.privateDecrypt(
    {
      key: keyPair.privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedData, 'base64'),
  )

  return decrypted.toString('utf8')
}

/**
 * Encrypt data using client's public key (for Export flow)
 *
 * @param clientPublicKey - Client's RSA public key in Base64 format
 * @param plaintext - Data to encrypt
 * @returns Base64 encoded encrypted data
 */
export function encryptWithClientKey (clientPublicKey: string, plaintext: string): string {
  const pemKey = base64ToPemPublicKey(clientPublicKey)

  const encrypted = crypto.publicEncrypt(
    {
      key: pemKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(plaintext, 'utf8'),
  )

  return encrypted.toString('base64')
}
