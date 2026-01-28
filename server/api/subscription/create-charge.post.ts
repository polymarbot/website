/**
 * POST /api/subscription/create-charge
 *
 * Create a Coinbase Commerce charge for subscription payment.
 * Creates payment record first to include id in redirect URLs,
 * then creates Coinbase charge and updates payment with charge details.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { plan, billingCycle } = validateRequestData(body, 'POST', '/api/subscription/create-charge')

  const existingPendingPayment = await db.subscriptionPayment.findFirst({
    where: {
      userId: user.id,
      status: PaymentStatus.PENDING,
      plan: plan as SubscriptionPlanType,
      billingCycle: billingCycle as BillingCycleType,
      chargeExpiresAt: { gt: new Date() },
    },
  })

  if (existingPendingPayment) {
    return {
      paymentId: existingPendingPayment.id,
      hostedUrl: existingPendingPayment.hostedUrl,
    }
  }

  const planDef = SUBSCRIPTION_PLANS[plan as SubscriptionPlanType]
  const cycle = billingCycle as BillingCycleType
  const periodDays = getPeriodDays(cycle)

  const isProd = process.env.APP_ENV === 'prod'
  const testPrefix = isProd ? '' : '[TEST] '
  const price = isProd ? getPeriodPrice(planDef, cycle) : 0.01

  const baseUrl = getRequestURL(event).origin

  // Create payment record first to get id for redirect URLs
  const payment = await db.subscriptionPayment.create({
    data: {
      userId: user.id,
      chargeId: '',
      chargeCode: '',
      hostedUrl: '',
      plan: plan as SubscriptionPlanType,
      billingCycle: cycle,
      amount: price,
      currency: PAYMENT_CURRENCY,
      status: PaymentStatus.PENDING,
      chargeExpiresAt: new Date(),
    },
  })

  const redirectUrl = `${baseUrl}/app/subscription/payments/${payment.id}/success`
  const cancelUrl = `${baseUrl}/app/subscription/payments/${payment.id}/cancel`

  let charge
  try {
    charge = await createCharge({
      name: `${testPrefix}${planDef.name} Subscription`,
      description: `${testPrefix}${planDef.name} plan - ${cycle === BillingCycle.YEARLY ? 'Annual' : 'Monthly'} (${periodDays} days)`,
      amount: price.toFixed(2),
      currency: PAYMENT_CURRENCY,
      redirectUrl,
      cancelUrl,
      metadata: {
        userId: user.id,
        plan,
        billingCycle: cycle,
        paymentId: payment.id,
      },
    })
  } catch (error) {
    console.error('Failed to create Coinbase charge:', error)
    await db.subscriptionPayment.delete({ where: { id: payment.id }})
    throwApiError(500, ERROR_CODES.PAYMENT_CHARGE_CREATION_FAILED)
  }

  await db.subscriptionPayment.update({
    where: { id: payment.id },
    data: {
      chargeId: charge.id,
      chargeCode: charge.code,
      hostedUrl: charge.hosted_url,
      chargeExpiresAt: new Date(charge.expires_at),
      metadata: charge as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    paymentId: payment.id,
    hostedUrl: charge.hosted_url,
  }
})
