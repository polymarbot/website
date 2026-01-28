/**
 * GET /api/subscription/payments/[id]
 *
 * Get a specific subscription payment by id.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')

  const payment = await db.subscriptionPayment.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      chargeCode: true,
      hostedUrl: true,
      plan: true,
      billingCycle: true,
      amount: true,
      currency: true,
      status: true,
      chargeExpiresAt: true,
      confirmedAt: true,
      createdAt: true,
    },
  })

  if (!payment) {
    throwApiError(404, ERROR_CODES.PAYMENT_NOT_FOUND)
  }

  return {
    id: payment.id,
    chargeCode: payment.chargeCode,
    hostedUrl: payment.hostedUrl,
    plan: payment.plan,
    billingCycle: payment.billingCycle,
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    chargeExpiresAt: payment.chargeExpiresAt.toISOString(),
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  }
})
