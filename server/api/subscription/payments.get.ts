/**
 * GET /api/subscription/payments
 *
 * Get current user's subscription payment history with pagination.
 *
 * @returns Paginated list of payment records
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const query = getQuery(event)
  const { offset, limit } = validateRequestData(query, 'GET', '/api/subscription/payments')

  const [ items, total ] = await Promise.all([
    db.subscriptionPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
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
    }),
    db.subscriptionPayment.count({
      where: { userId: user.id },
    }),
  ])

  return {
    items: items.map(item => ({
      ...item,
      amount: item.amount.toString(),
      chargeExpiresAt: item.chargeExpiresAt.toISOString(),
      confirmedAt: item.confirmedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    pagination: {
      total,
      offset,
      limit,
    },
  }
})
