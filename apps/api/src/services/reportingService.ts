import { prisma } from '../utils/prisma';

export class ReportingService {
  /**
   * Retrieves high-level executive dashboard metrics via database aggregations.
   */
  static async getOverviewMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // 1. Total Customers
    const totalCustomers = await prisma.customerProfile.count();

    // 2. Subscriptions count by status
    const subscriptionCounts = await prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const activeSubscriptions =
      subscriptionCounts.find((s) => s.status === 'ACTIVE')?._count.id || 0;

    const newSubscriptions30d = await prisma.subscription.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // 3. Invoice financial aggregations
    const invoiceAggregations = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
        amountPaid: true,
        balance: true,
      },
    });

    const totalInvoiced = Number(invoiceAggregations._sum.totalAmount || 0);
    const totalCollected = Number(invoiceAggregations._sum.amountPaid || 0);
    const totalOutstanding = Number(invoiceAggregations._sum.balance || 0);

    // 4. Overdue Invoices: balance > 0 and dueDate < now
    const overdueInvoicesCount = await prisma.invoice.count({
      where: {
        balance: { gt: 0 },
        dueDate: { lt: now },
        status: { notIn: ['CANCELLED', 'VOID', 'PAID'] },
      },
    });

    const overdueAmountAggregate = await prisma.invoice.aggregate({
      where: {
        balance: { gt: 0 },
        dueDate: { lt: now },
        status: { notIn: ['CANCELLED', 'VOID', 'PAID'] },
      },
      _sum: { balance: true },
    });
    const totalOverdueAmount = Number(overdueAmountAggregate._sum.balance || 0);

    // 5. Upcoming Renewals in the next 7 days
    const upcomingRenewalsCount = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { gte: now, lte: sevenDaysFromNow },
      },
    });

    return {
      totalCustomers,
      activeSubscriptions,
      newSubscriptions30d,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueInvoicesCount,
      totalOverdueAmount,
      upcomingRenewalsCount,
    };
  }

  /**
   * Monthly collections trend for the past 6-12 months.
   */
  static async getMonthlyCollections() {
    const rawPayments: Array<{ month: string; amount: string }> = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("paymentDate", 'YYYY-MM') as month,
        COALESCE(SUM("amount"), 0)::text as amount
      FROM "Payment"
      WHERE "status" = 'SUCCESS'
        AND "paymentDate" >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR("paymentDate", 'YYYY-MM')
      ORDER BY month ASC
    `;

    return rawPayments.map((p) => ({
      month: p.month,
      amount: parseFloat(p.amount) || 0,
    }));
  }

  /**
   * Status distribution for Invoices and Subscriptions.
   */
  static async getStatusDistribution() {
    const [invoiceStatuses, subscriptionStatuses] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    return {
      invoices: invoiceStatuses.map((s) => ({
        status: s.status,
        count: s._count.id,
        totalAmount: Number(s._sum.totalAmount || 0),
      })),
      subscriptions: subscriptionStatuses.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  /**
   * Revenue by subscription plan.
   */
  static async getRevenueByPlan() {
    const plansWithRevenue: Array<{ planName: string; activeCount: number; estimatedRevenue: number }> =
      await prisma.$queryRaw`
        SELECT 
          p."name" as "planName",
          COUNT(s."id")::int as "activeCount",
          COALESCE(SUM(s."totalAmount"), 0)::float as "estimatedRevenue"
        FROM "Plan" p
        LEFT JOIN "Subscription" s ON s."planId" = p."id" AND s."status" = 'ACTIVE'
        GROUP BY p."id", p."name"
        ORDER BY "estimatedRevenue" DESC
      `;

    return plansWithRevenue;
  }
}
