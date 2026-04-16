import { CACHE_TTL } from './constants'

const walletCache = createWalletCache(CACHE_TTL.WALLET_BALANCE)

export const getUSDCeBalanceCached = walletCache.getBalanceCached
export const getUSDCeBalancesBatchCached = walletCache.getBalancesBatchCached
export const invalidateBalanceCache = walletCache.invalidateBalance
