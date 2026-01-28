/**
 * POST /api/subscription/webhook
 *
 * Handle Coinbase Commerce webhook events.
 * This endpoint is called by Coinbase when a charge status changes.
 *
 * Supported events:
 * - charge:confirmed - Payment confirmed, update subscription
 * - charge:failed - Payment failed
 * - charge:pending - Payment pending (no action needed)
 */
export default defineEventHandler(async event => {
  // Get raw body for signature verification
  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Missing request body' })
  }

  // Get signature from header
  const signature = getHeader(event, 'x-cc-webhook-signature')
  if (!signature) {
    throw createError({ statusCode: 400, message: 'Missing webhook signature' })
  }

  // Parse and verify webhook event
  const webhookEvent = parseWebhookEvent(rawBody, signature)
  if (!webhookEvent) {
    console.error('Invalid webhook signature or event parsing failed')
    throw createError({ statusCode: 400, message: 'Invalid webhook signature' })
  }

  const chargeId = webhookEvent.data.id
  const chargeCode = webhookEvent.data.code

  console.debug(`Received Coinbase webhook: ${webhookEvent.type} for charge ${chargeCode}`)

  // Find the payment record
  const payment = await db.subscriptionPayment.findUnique({
    where: { chargeId },
  })

  if (!payment) {
    console.error(`Payment not found for charge ${chargeId}`)
    // Return 200 to prevent Coinbase from retrying
    return { received: true }
  }

  // Handle different event types
  switch (webhookEvent.type) {
    case 'charge:confirmed': {
      await handleChargeConfirmed(payment)
      break
    }
    case 'charge:failed': {
      await handleChargeFailed(payment)
      break
    }
    case 'charge:pending': {
      // No action needed for pending status
      console.debug(`Charge ${chargeCode} is pending`)
      break
    }
    default: {
      console.debug(`Unhandled webhook event type: ${webhookEvent.type}`)
    }
  }

  // Return 200 to acknowledge receipt
  return { received: true }
})

/**
 * Handle charge confirmed event
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
  const currentSubscription = await db.userSubscription.findUnique({
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
  await db.$transaction([
    // Update payment status
    db.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: now,
      },
    }),
    // Update or create subscription
    db.userSubscription.upsert({
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
 * Handle charge failed event
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

  await db.subscriptionPayment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.FAILED },
  })

  console.debug(`Payment ${payment.id} marked as failed`)
}
