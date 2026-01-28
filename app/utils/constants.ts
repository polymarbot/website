/**
 * Wallet status to severity color mapping
 * Used for Tag component severity prop
 */
export const WalletStatusSeverityMap: Record<WalletStatusType, string> = {
  [WalletStatus.ACTIVE]: 'success',
  [WalletStatus.DEPLOYING]: 'warn',
  [WalletStatus.FAILED]: 'danger',
  [WalletStatus.INACTIVE]: 'secondary',
}
