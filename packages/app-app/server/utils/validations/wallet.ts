/**
 * Wallet Validation Utilities
 */

// ============================================================================
// Existence
// ============================================================================

/**
 * Validate wallet does not exist or is deleted
 */
export async function validateWalletNotExists (
  funder: string,
  userId: string,
): Promise<void> {
  const wallet = await appDb.wallet.findUnique({
    where: { funder },
    select: { ownerId: true, deleted: true },
  })

  if (!wallet || wallet.deleted) {
    return
  }

  if (wallet.ownerId === userId) {
    throwApiError(409, ERROR_CODES.WALLET_ALREADY_EXISTS)
  } else {
    throwApiError(409, ERROR_CODES.WALLET_ALREADY_IN_USE)
  }
}

/**
 * Validate wallet exists and return it
 */
export async function validateWalletExists (funder: string): Promise<Wallet> {
  const wallet = await appDb.wallet.findUnique({
    where: { funder, deleted: false },
  })

  if (!wallet) {
    throwApiError(404, ERROR_CODES.WALLET_NOT_FOUND)
  }

  return wallet
}

// ============================================================================
// Ownership
// ============================================================================

/**
 * Validate wallet exists and belongs to the current user
 */
export async function validateWalletOwnership (
  funder: string,
  userId: string,
): Promise<Wallet> {
  const wallet = await appDb.wallet.findFirst({
    where: {
      funder,
      ownerId: userId,
      deleted: false,
    },
  })

  if (!wallet) {
    throwApiError(404, ERROR_CODES.WALLET_NOT_FOUND)
  }

  return wallet
}

// ============================================================================
// Dependencies
// ============================================================================

/**
 * Check if wallet has dependent bots and throw error if any exist
 */
export async function validateWalletNoBots (funder: string): Promise<void> {
  const result = await checkDependentBots({ funder })

  if (result.count > 0) {
    throwApiError(400, ERROR_CODES.WALLET_HAS_BOTS, {
      botCount: result.count,
      bots: result.bots,
    })
  }
}
