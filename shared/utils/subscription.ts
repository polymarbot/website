/**
 * Subscription Plan Definitions
 *
 * This module defines all subscription plans and their resource limits.
 * Used by both frontend and backend for consistent limit checking.
 */

import {
  BillingCycle,
  type BillingCycleType,
  SubscriptionPlan,
  type SubscriptionPlanType,
} from '../types/db'

// Payment currency for subscription charges
export const PAYMENT_CURRENCY = 'USD'

// Plan order for comparison (lowest to highest)
export const PLAN_ORDER = [
  SubscriptionPlan.FREE,
  SubscriptionPlan.PRO,
  SubscriptionPlan.PLUS,
  SubscriptionPlan.MAX,
] as const

// Paid plans only (excludes FREE, used for payment validation)
export const PAID_PLANS = [
  SubscriptionPlan.PRO,
  SubscriptionPlan.PLUS,
  SubscriptionPlan.MAX,
] as const
export type PaidPlanType = (typeof PAID_PLANS)[number]

export interface PlanLimits {
  wallets: number
  strategies: number
  bots: number
  maxStrategyAmount: number | null // null = unlimited
}

export interface PlanDefinition {
  name: string
  price: number // Monthly price in USD, 0 = free
  yearlyPrice: number // Yearly price in USD (pay for 10 months, get 12)
  limits: PlanLimits
}

// Yearly discount: pay for 10 months, get 12 months (save ~17%)
export const YEARLY_DISCOUNT_MONTHS = 2

/**
 * Calculate yearly price based on monthly price and discount
 */
function calcYearlyPrice (monthlyPrice: number): number {
  return monthlyPrice * (12 - YEARLY_DISCOUNT_MONTHS)
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    limits: {
      wallets: 5,
      strategies: 5,
      bots: 5,
      maxStrategyAmount: 2,
    },
  },
  [SubscriptionPlan.PRO]: {
    name: 'Pro',
    price: 19,
    yearlyPrice: calcYearlyPrice(19),
    limits: {
      wallets: 20,
      strategies: 20,
      bots: 20,
      maxStrategyAmount: 20,
    },
  },
  [SubscriptionPlan.PLUS]: {
    name: 'Plus',
    price: 99,
    yearlyPrice: calcYearlyPrice(99),
    limits: {
      wallets: 100,
      strategies: 100,
      bots: 100,
      maxStrategyAmount: 100,
    },
  },
  [SubscriptionPlan.MAX]: {
    name: 'Max',
    price: 999,
    yearlyPrice: calcYearlyPrice(999),
    limits: {
      wallets: 1000,
      strategies: 1000,
      bots: 1000,
      maxStrategyAmount: null, // Unlimited
    },
  },
}

/**
 * Get plan limits, treating expired subscriptions as FREE
 *
 * @param plan - The subscription plan type
 * @param expiresAt - The expiration date of the subscription (null = never expires)
 * @returns The effective plan limits
 */
export function getPlanLimits (plan: SubscriptionPlanType, expiresAt: Date | null): PlanLimits {
  // FREE plan never expires
  if (plan === SubscriptionPlan.FREE) {
    return SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].limits
  }

  // Check if subscription is expired
  if (expiresAt && new Date() > expiresAt) {
    return SUBSCRIPTION_PLANS[SubscriptionPlan.FREE].limits
  }

  return SUBSCRIPTION_PLANS[plan].limits
}

/**
 * Check if a subscription is expired
 *
 * @param plan - The subscription plan type
 * @param expiresAt - The expiration date of the subscription
 * @returns true if the subscription is expired
 */
export function isSubscriptionExpired (plan: SubscriptionPlanType, expiresAt: Date | null): boolean {
  // FREE plan never expires
  if (plan === SubscriptionPlan.FREE) {
    return false
  }

  // No expiration date means never expires (lifetime)
  if (!expiresAt) {
    return false
  }

  return new Date() > expiresAt
}

/**
 * Calculate yearly savings compared to monthly billing
 */
export function getYearlySavings (plan: PlanDefinition): number {
  return plan.price * 12 - plan.yearlyPrice
}

/**
 * Calculate monthly equivalent price when paying yearly
 */
export function getMonthlyEquivalent (yearlyPrice: number): number {
  return yearlyPrice / 12
}

/**
 * Calculate yearly discount percentage (rounded)
 */
export function getYearlyDiscountPercent (plan: PlanDefinition): number {
  if (plan.price === 0) return 0
  const fullYearlyPrice = plan.price * 12
  return Math.round(((fullYearlyPrice - plan.yearlyPrice) / fullYearlyPrice) * 100)
}

// ============================================================================
// Subscription Action Calculations (used by both frontend and backend)
// ============================================================================

export type SubscriptionAction = 'renew' | 'upgrade' | 'downgrade'

export interface SubscriptionActionResult {
  action: SubscriptionAction
  targetPlan: SubscriptionPlanType
  billingCycle: BillingCycleType
  newDays: number // Total days after the action
  convertedDays: number // Days converted from current plan value
  creditAmount: number // Credit amount from remaining subscription value
  amountToPay: number // Amount to pay (0 if fully covered)
  isFullyCovered: boolean // Whether converted days cover the full period
}

/**
 * Get period days for a billing cycle
 */
export function getPeriodDays (cycle: BillingCycleType): number {
  return cycle === BillingCycle.YEARLY ? 365 : 30
}

/**
 * Get price for a billing cycle
 */
export function getPeriodPrice (plan: PlanDefinition, cycle: BillingCycleType): number {
  return cycle === BillingCycle.YEARLY ? plan.yearlyPrice : plan.price
}

/**
 * Get daily price for a plan based on billing cycle
 */
export function getDailyPrice (plan: PlanDefinition, cycle: BillingCycleType): number {
  if (plan.price === 0) return 0
  return getPeriodPrice(plan, cycle) / getPeriodDays(cycle)
}

/**
 * Get plan order index for comparison
 */
export function getPlanIndex (plan: SubscriptionPlanType): number {
  return PLAN_ORDER.indexOf(plan)
}

/**
 * Determine the subscription action type
 */
export function getSubscriptionAction (
  currentPlan: SubscriptionPlanType,
  targetPlan: SubscriptionPlanType,
): SubscriptionAction {
  if (currentPlan === targetPlan) return 'renew'
  return getPlanIndex(targetPlan) > getPlanIndex(currentPlan) ? 'upgrade' : 'downgrade'
}

/**
 * Get monthly daily price (used for calculating remaining value)
 * Uses monthly price as standard basis for all calculations
 */
export function getMonthlyDailyPrice (plan: PlanDefinition): number {
  if (plan.price === 0) return 0
  return plan.price / 30
}

/**
 * Calculate upgrade result
 * - User pays the difference for a full period
 * - Remaining value converts to extra days
 * - Remaining value is calculated using monthly price as standard basis
 */
export function calculateUpgrade (
  currentPlanType: SubscriptionPlanType,
  targetPlanType: SubscriptionPlanType,
  remainingDays: number,
  targetCycle: BillingCycleType,
): SubscriptionActionResult {
  const currentPlan = SUBSCRIPTION_PLANS[currentPlanType]
  const targetPlan = SUBSCRIPTION_PLANS[targetPlanType]

  const periodDays = getPeriodDays(targetCycle)
  // Use monthly price as standard basis for remaining value
  const currentDailyPrice = getMonthlyDailyPrice(currentPlan)
  const targetDailyPrice = getDailyPrice(targetPlan, targetCycle)

  // Remaining value of current plan
  const remainingValue = remainingDays * currentDailyPrice

  // Days covered by remaining value in the new plan
  const convertedDays = targetDailyPrice > 0 ? remainingValue / targetDailyPrice : 0

  // Round credit amount to 2 decimal places
  const creditAmount = Math.floor(remainingValue * 100) / 100

  // If converted days cover the full period, no payment needed
  if (convertedDays >= periodDays) {
    return {
      action: 'upgrade',
      targetPlan: targetPlanType,
      billingCycle: targetCycle,
      newDays: Math.floor(convertedDays),
      convertedDays: Math.floor(convertedDays),
      creditAmount,
      amountToPay: 0,
      isFullyCovered: true,
    }
  }

  // Calculate the amount to pay for the remaining days
  const daysNeeded = periodDays - convertedDays
  const amountToPay = daysNeeded * targetDailyPrice

  return {
    action: 'upgrade',
    targetPlan: targetPlanType,
    billingCycle: targetCycle,
    newDays: periodDays,
    convertedDays: Math.floor(convertedDays),
    creditAmount,
    amountToPay: Math.ceil(amountToPay * 100) / 100,
    isFullyCovered: false,
  }
}

/**
 * Calculate downgrade result
 * - No refund, remaining value converts to more days in the lower plan
 * - Remaining value is calculated using monthly price as standard basis
 */
export function calculateDowngrade (
  currentPlanType: SubscriptionPlanType,
  targetPlanType: SubscriptionPlanType,
  remainingDays: number,
  targetCycle: BillingCycleType,
): SubscriptionActionResult {
  const currentPlan = SUBSCRIPTION_PLANS[currentPlanType]
  const targetPlan = SUBSCRIPTION_PLANS[targetPlanType]

  // Use monthly price as standard basis for remaining value
  const currentDailyPrice = getMonthlyDailyPrice(currentPlan)
  const targetDailyPrice = getDailyPrice(targetPlan, targetCycle)

  // Convert remaining value to days in target plan
  const remainingValue = remainingDays * currentDailyPrice
  const convertedDays = targetDailyPrice > 0 ? remainingValue / targetDailyPrice : 0

  // Round credit amount to 2 decimal places
  const creditAmount = Math.floor(remainingValue * 100) / 100

  return {
    action: 'downgrade',
    targetPlan: targetPlanType,
    billingCycle: targetCycle,
    newDays: Math.floor(convertedDays),
    convertedDays: Math.floor(convertedDays),
    creditAmount,
    amountToPay: 0,
    isFullyCovered: true,
  }
}

/**
 * Calculate renewal result
 * - New period days are added to remaining days
 */
export function calculateRenewal (
  planType: SubscriptionPlanType,
  remainingDays: number,
  billingCycle: BillingCycleType,
): SubscriptionActionResult {
  const plan = SUBSCRIPTION_PLANS[planType]
  const periodDays = getPeriodDays(billingCycle)
  const periodPrice = getPeriodPrice(plan, billingCycle)

  return {
    action: 'renew',
    targetPlan: planType,
    billingCycle,
    newDays: remainingDays + periodDays,
    convertedDays: 0,
    creditAmount: 0,
    amountToPay: periodPrice,
    isFullyCovered: false,
  }
}
