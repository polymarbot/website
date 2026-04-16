/**
 * User Validation Utilities
 */

/**
 * Validate user does not exist (for sign-up)
 */
export async function validateUserNotExists (email: string): Promise<void> {
  const user = await appDb.user.findUnique({
    where: { email },
  })

  if (user) {
    throwApiError(409, ERROR_CODES.AUTH_USER_ALREADY_EXISTS)
  }
}

/**
 * Validate user exists (for sign-in)
 */
export async function validateUserExists (email: string): Promise<void> {
  const user = await appDb.user.findUnique({
    where: { email },
  })

  if (!user) {
    throwApiError(404, ERROR_CODES.AUTH_USER_NOT_FOUND)
  }
}
