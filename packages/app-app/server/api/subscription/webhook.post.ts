/**
 * POST /api/subscription/webhook
 *
 * Handle payment gateway webhook/IPN callbacks.
 * This endpoint is called by the payment gateway when a payment status changes.
 *
 * Supported statuses:
 * - finished - Payment completed successfully, update subscription
 * - failed / expired / refunded - Payment failed
 * - confirming / confirmed / sending - Payment in progress (no action needed)
 */
export default defineEventHandler(async event => {
  // Get raw body for signature verification
  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Missing request body' })
  }

  // Get signature from header
  const signature = getHeader(event, 'x-nowpayments-sig')
  if (!signature) {
    throw createError({ statusCode: 400, message: 'Missing IPN signature' })
  }

  // Parse and verify IPN event
  const ipnEvent = parseIpnEvent(rawBody, signature)
  if (!ipnEvent) {
    console.error('Invalid IPN signature or event parsing failed')
    throw createError({ statusCode: 400, message: 'Invalid IPN signature' })
  }

  const orderId = ipnEvent.order_id
  const paymentStatus = ipnEvent.payment_status

  console.debug(`Received payment webhook: status=${paymentStatus} for order ${orderId}`)

  // Find the payment record by chargeCode (= order_id)
  const payment = await appDb.subscriptionPayment.findUnique({
    where: { chargeCode: orderId },
  })

  if (!payment) {
    console.error(`Payment not found for order ${orderId}`)
    // Return 200 to prevent the gateway from retrying
    return { received: true }
  }

  // Handle different payment statuses
  switch (paymentStatus) {
    case 'finished': {
      await handleChargeConfirmed(payment)
      break
    }
    case 'partially_paid': {
      // User sent less than required amount; keep PENDING and wait for further payment or expiration
      console.debug(`Payment ${orderId} partially paid: ${ipnEvent.actually_paid} / ${ipnEvent.price_amount} ${ipnEvent.price_currency}`)
      break
    }
    case 'failed':
    case 'expired':
    case 'refunded': {
      await handleChargeFailed(payment)
      break
    }
    default: {
      // confirming, confirmed, sending, waiting - no action needed
      console.debug(`Payment ${orderId} status: ${paymentStatus}`)
    }
  }

  // Return 200 to acknowledge receipt
  return { received: true }
})

/**
 * Handle payment confirmed (finished) event
 * Update payment status and user subscription
 */
async function handleChargeConfirmed (payment: {
  id: string
  userId: string
  plan: SubscriptionPlanType
  billingCycle: BillingCycleType
  status: PaymentStatusType
}) {
  // Skip if already confirmed (idempotency)
  if (payment.status === PaymentStatus.CONFIRMED) {
    console.debug(`Payment ${payment.id} already confirmed, skipping`)
    return
  }

  const now = new Date()

  // Calculate new expiration date
  const periodDays = getPeriodDays(payment.billingCycle)

  // Get current subscription to calculate new expiration
  const currentSubscription = await appDb.userSubscription.findUnique({
    where: { userId: payment.userId },
  })

  let newExpiresAt: Date

  if (currentSubscription && currentSubscription.expiresAt && currentSubscription.expiresAt > now) {
    // Add days to existing subscription
    newExpiresAt = new Date(currentSubscription.expiresAt)
    newExpiresAt.setDate(newExpiresAt.getDate() + periodDays)
  } else {
    // Start fresh from now
    newExpiresAt = new Date(now)
    newExpiresAt.setDate(newExpiresAt.getDate() + periodDays)
  }

  // Update payment status and subscription in a transaction
  await appDb.$transaction([
    // Update payment status
    appDb.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: now,
      },
    }),
    // Update or create subscription
    appDb.userSubscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        plan: payment.plan,
        expiresAt: newExpiresAt,
      },
      update: {
        plan: payment.plan,
        expiresAt: newExpiresAt,
      },
    }),
  ])

  console.debug(`Payment ${payment.id} confirmed. Subscription updated: ${payment.plan} until ${newExpiresAt.toISOString()}`)
}

/**
 * Handle payment failed event
 * Update payment status to failed
 */
async function handleChargeFailed (payment: {
  id: string
  status: PaymentStatusType
}) {
  // Skip if already processed (idempotency)
  if (payment.status !== PaymentStatus.PENDING) {
    console.debug(`Payment ${payment.id} already processed (${payment.status}), skipping`)
    return
  }

  await appDb.subscriptionPayment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.FAILED },
  })

  console.debug(`Payment ${payment.id} marked as failed`)
}
