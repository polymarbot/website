/**
 * RSA Encryption Utility for Secure Private Key Transfer (Client-side)
 *
 * Uses Web Crypto API with RSA-OAEP and SHA-256 for encrypting sensitive data.
 * All public keys are transmitted in Base64 format (without PEM headers) for security.
 */

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert Base64 encoded public key to CryptoKey
 */
async function base64ToPublicKey (base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    [ 'encrypt' ],
  )
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64 (buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer (base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generate a new RSA key pair for secure data transfer
 *
 * @returns Public key (Base64) for sending to server, private key (CryptoKey) for local decryption
 */
export async function generateClientKeyPair (): Promise<{
  publicKey: string
  privateKey: CryptoKey
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([ 1, 0, 1 ]),
      hash: 'SHA-256',
    },
    true,
    [ 'encrypt', 'decrypt' ],
  )

  const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKey = arrayBufferToBase64(exportedPublicKey)

  return { publicKey, privateKey: keyPair.privateKey }
}

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Encrypt data using server's public key (for Import flow)
 *
 * @param serverPublicKey - Server's RSA public key in Base64 format
 * @param plaintext - Data to encrypt
 * @returns Base64 encoded encrypted data
 */
export async function encryptWithServerKey (serverPublicKey: string, plaintext: string): Promise<string> {
  const publicKey = await base64ToPublicKey(serverPublicKey)
  const data = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    data,
  )

  return arrayBufferToBase64(encrypted)
}

/**
 * Decrypt data using client's private key (for Export flow)
 *
 * @param clientPrivateKey - Client's CryptoKey private key
 * @param encryptedData - Base64 encoded encrypted data from server
 * @returns Decrypted plaintext
 */
export async function decryptWithClientKey (clientPrivateKey: CryptoKey, encryptedData: string): Promise<string> {
  const data = base64ToArrayBuffer(encryptedData)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    clientPrivateKey,
    data,
  )

  return new TextDecoder().decode(decrypted)
}
