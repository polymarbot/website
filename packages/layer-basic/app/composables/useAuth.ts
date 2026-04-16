/**
 * Mock implementation of an authentication composable for the Layer Basic app.
 */
export function useAuth () {
  const loggedIn = ref(false)
  async function signOut (): Promise<void> {}

  return {
    loggedIn,
    signOut,
  }
}
