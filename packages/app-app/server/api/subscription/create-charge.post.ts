/**
 * POST /api/subscription/create-charge
 *
 * Create a payment invoice for subscription.
 * Creates payment record first to include id in redirect URLs,
 * then creates invoice via payment gateway and updates payment with invoice details.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { plan, billingCycle } = validateRequestData(body, 'POST', '/api/subscription/create-charge')

  const existingPendingPayment = await appDb.subscriptionPayment.findFirst({
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
  const price = isProd ? getPeriodPrice(planDef, cycle) : 1

  const baseUrl = getRequestURL(event).origin

  // Create payment record first to get id for redirect URLs
  const payment = await appDb.subscriptionPayment.create({
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

  // Generate order ID from payment ID as the charge code
  const orderId = `PAY-${payment.id.slice(-8).toUpperCase()}`

  const redirectUrl = `${baseUrl}/subscription/payments/${payment.id}/success`
  const cancelUrl = `${baseUrl}/subscription/payments/${payment.id}/cancel`
  const ipnCallbackUrl = `${baseUrl}/api/subscription/webhook`

  let invoice
  try {
    invoice = await createInvoice({
      priceAmount: price,
      priceCurrency: PAYMENT_CURRENCY,
      orderId,
      orderDescription: `${testPrefix}${planDef.name} plan - ${cycle === BillingCycle.YEARLY ? 'Annual' : 'Monthly'} (${periodDays} days)`,
      successUrl: redirectUrl,
      cancelUrl,
      ipnCallbackUrl,
    })
  } catch (error) {
    console.error('Failed to create payment invoice:', error)
    await appDb.subscriptionPayment.delete({ where: { id: payment.id }})
    throwApiError(500, ERROR_CODES.PAYMENT_CHARGE_CREATION_FAILED)
  }

  // Invoice expiration: 1 hour from creation
  const chargeExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await appDb.subscriptionPayment.update({
    where: { id: payment.id },
    data: {
      chargeId: String(invoice.id),
      chargeCode: orderId,
      hostedUrl: invoice.invoice_url,
      chargeExpiresAt,
      metadata: invoice as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    paymentId: payment.id,
    hostedUrl: invoice.invoice_url,
  }
})
