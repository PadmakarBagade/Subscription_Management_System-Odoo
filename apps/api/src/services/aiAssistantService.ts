import { ReportingService } from './reportingService';
import { prisma } from '../utils/prisma';

export class AiAssistantService {
  /**
   * Processes a read-only natural language query regarding revenue and financial metrics.
   * Pulls real database statistics and provides an accurate, transparent explanation.
   */
  static async queryRevenueMetrics(question: string) {
    const q = question.toLowerCase();

    // Fetch live platform metrics
    const overview = await ReportingService.getOverviewMetrics();
    const plans = await ReportingService.getRevenueByPlan();
    const monthlyCollections = await ReportingService.getMonthlyCollections();

    let answer = '';
    let category = 'OVERVIEW';
    const suggestedActions: Array<{ label: string; url: string }> = [];

    if (q.includes('overdue') || q.includes('due') || q.includes('unpaid')) {
      category = 'OVERDUE_INVOICES';
      answer = `You currently have ${overview.overdueInvoicesCount} overdue invoice(s) totaling ₹${overview.totalOverdueAmount.toLocaleString('en-IN')}. Outstanding balance across all open invoices is ₹${overview.totalOutstanding.toLocaleString('en-IN')}.`;
      suggestedActions.push({ label: 'Review Overdue Invoices', url: '/admin/invoices?status=OVERDUE' });
    } else if (q.includes('plan') || q.includes('tier') || q.includes('product')) {
      category = 'PLAN_REVENUE';
      const topPlan = plans.length > 0 ? plans[0] : null;
      answer = `Currently, the top performing plan is "${topPlan?.planName || 'Standard'}" with ${topPlan?.activeCount || 0} active subscriptions contributing approximately ₹${(topPlan?.estimatedRevenue || 0).toLocaleString('en-IN')} in recurring revenue.`;
      suggestedActions.push({ label: 'Manage Subscription Plans', url: '/admin/plans' });
    } else if (q.includes('renew') || q.includes('upcoming') || q.includes('churn')) {
      category = 'RENEWALS';
      answer = `There are ${overview.upcomingRenewalsCount} active subscription(s) scheduled for recurring renewal within the next 7 days. The automated billing engine will process these on their respective billing dates.`;
      suggestedActions.push({ label: 'View Upcoming Renewals', url: '/admin/subscriptions' });
    } else if (q.includes('collection') || q.includes('paid') || q.includes('month') || q.includes('trend')) {
      category = 'COLLECTIONS';
      const recentMonth = monthlyCollections.length > 0 ? monthlyCollections[monthlyCollections.length - 1] : null;
      answer = `Total collected payments to date are ₹${overview.totalCollected.toLocaleString('en-IN')}. Most recent recorded monthly collection is ₹${(recentMonth?.amount || 0).toLocaleString('en-IN')}. Total invoiced revenue across all periods stands at ₹${overview.totalInvoiced.toLocaleString('en-IN')}.`;
      suggestedActions.push({ label: 'View Revenue Reports', url: '/admin/reports' });
    } else {
      // General financial summary
      answer = `Platform Summary: We have ${overview.totalCustomers} total customers and ${overview.activeSubscriptions} active subscriptions. Total invoiced amount is ₹${overview.totalInvoiced.toLocaleString('en-IN')}, of which ₹${overview.totalCollected.toLocaleString('en-IN')} has been collected, leaving an outstanding balance of ₹${overview.totalOutstanding.toLocaleString('en-IN')}. ${overview.overdueInvoicesCount} invoice(s) are currently overdue.`;
      suggestedActions.push({ label: 'View Financial Dashboard', url: '/admin' });
      suggestedActions.push({ label: 'Review Outstanding Balances', url: '/admin/reports' });
    }

    return {
      query: question,
      category,
      response: answer,
      dataBasis: {
        totalCustomers: overview.totalCustomers,
        activeSubscriptions: overview.activeSubscriptions,
        totalInvoiced: overview.totalInvoiced,
        totalCollected: overview.totalCollected,
        totalOutstanding: overview.totalOutstanding,
        overdueCount: overview.overdueInvoicesCount,
      },
      suggestedActions,
    };
  }
}
