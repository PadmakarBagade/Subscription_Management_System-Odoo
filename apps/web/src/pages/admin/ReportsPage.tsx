import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Users,
  RotateCw,
  PieChart as PieIcon,
  Calendar,
  Loader2,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  Send,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'overdue' | 'payments' | 'subscriptions'>('overview');
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'quarter' | 'ytd' | 'all'>('this_month');
  const [loading, setLoading] = useState(true);

  // Overview metrics & charts
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any>(null);
  const [planRevenue, setPlanRevenue] = useState<any[]>([]);

  // Month-end tab datasets
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [collectionsLedger, setCollectionsLedger] = useState<any[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [chasingId, setChasingId] = useState<string | null>(null);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [overviewRes, revenueRes, statusRes, plansRes, invoicesRes, paymentsRes, subsRes] = await Promise.all([
        apiRequest('/reports/overview'),
        apiRequest('/reports/revenue'),
        apiRequest('/reports/status'),
        apiRequest('/reports/plans'),
        apiRequest('/invoices?status=OVERDUE&limit=50'),
        apiRequest('/payments?limit=50'),
        apiRequest('/subscriptions?status=ACTIVE&limit=50'),
      ]);

      if (overviewRes.success) setMetrics(overviewRes.data);
      if (revenueRes.success) setRevenueTrend(revenueRes.data);
      if (statusRes.success) setDistribution(statusRes.data);
      if (plansRes.success) setPlanRevenue(plansRes.data);
      if (invoicesRes.success && Array.isArray(invoicesRes.data)) setOverdueInvoices(invoicesRes.data);
      if (paymentsRes.success && Array.isArray(paymentsRes.data)) setCollectionsLedger(paymentsRes.data);
      if (subsRes.success && Array.isArray(subsRes.data)) setActiveSubscriptions(subsRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [period]);

  const handleSendReminder = async (invoiceId: string) => {
    setChasingId(invoiceId);
    try {
      await apiRequest(`/invoices/${invoiceId}/send`, { method: 'POST' });
      alert('Overdue reminder email successfully sent to customer.');
    } catch (err: any) {
      alert(`Failed to send reminder: ${err.message || 'Error'}`);
    } finally {
      setChasingId(null);
    }
  };

  const getAgingBadge = (dueDateStr: string) => {
    const dueDate = new Date(dueDateStr);
    const now = new Date();
    const diffDays = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));

    if (diffDays <= 15) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {diffDays}d (1-15d)
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          {diffDays}d (16-30d)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        {diffDays}d (30+d Critical)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Aggregating financial metrics, invoices & ledger...</p>
      </div>
    );
  }

  const subscriptionChartData =
    distribution?.subscriptions?.map((s: any) => ({
      name: s.status,
      value: s.count,
    })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Finance Lead Month-End Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial reconciliation: active subscriptions, total revenue collected, outstanding receivables, and overdue collections desk.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'quarter', label: 'This Quarter' },
            { id: 'ytd', label: 'Year-to-Date' },
            { id: 'all', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                period === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core Financial Answers from Story 7 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 0}
          icon={RotateCw}
          description="Currently active software contracts"
        />
        <StatCard
          title="Revenue Collected"
          value={`₹${Number(metrics?.totalCollected || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })}`}
          icon={DollarSign}
          description="Reconciled cash & online payments"
        />
        <StatCard
          title="Outstanding Balance (Owed)"
          value={`₹${Number(metrics?.totalOutstanding || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })}`}
          icon={TrendingUp}
          description="Total uncollected receivables"
        />
        <StatCard
          title="Overdue Invoices"
          value={metrics?.overdueInvoicesCount || 0}
          icon={AlertCircle}
          description={`₹${Number(metrics?.totalOverdueAmount || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })} past due date`}
        />
      </div>

      {/* Tab Navigation for Month-End Operations */}
      <div className="flex border-b border-slate-200 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Financial Analytics
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`pb-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'overdue'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500" />
          Overdue Aging Chase Desk ({overdueInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-500" />
          Reconciled Collections Ledger ({collectionsLedger.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'subscriptions'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <RotateCw className="w-4 h-4 text-indigo-500" />
          Active Subscriptions Register ({activeSubscriptions.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Collections Trend */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Monthly Collections Trend (₹)</h3>
                  <p className="text-xs text-slate-400">Actual reconciled payments per month</p>
                </div>
                <Badge variant="success">Reconciled</Badge>
              </div>

              <div className="h-72 w-full">
                {revenueTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No monthly payment history yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueTrend}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [
                          `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                          'Collections',
                        ]}
                      />
                      <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Subscription Status Breakdown */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Subscription Status Breakdown</h3>
                  <p className="text-xs text-slate-400">Active vs Paused vs Closed Contracts</p>
                </div>
                <Badge variant="neutral">Portfolio Health</Badge>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                {subscriptionChartData.length === 0 ? (
                  <div className="text-xs text-slate-400">No subscriptions data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subscriptionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {subscriptionChartData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Revenue by Plan breakdown */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Estimated Revenue Contribution by Plan</h3>
                <p className="text-xs text-slate-400">Contract value generated by currently active subscriptions</p>
              </div>
              <Badge variant="info">Tier Performance</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Plan Name</th>
                    <th className="px-4 py-3 text-center">Active Contracts</th>
                    <th className="px-4 py-3 text-right">Estimated Revenue Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planRevenue.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.planName}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{p.activeCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600 text-sm">
                        ₹{Number(p.estimatedRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: OVERDUE AGING CHASE DESK */}
      {activeTab === 'overdue' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Actionable Overdue Invoices</h3>
              <p className="text-xs text-slate-500">
                Sorted by highest risk. Immediate automated email reminder dispatch available.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Delinquent:</span>
              <span className="ml-2 font-mono font-bold text-rose-600 text-sm">
                ₹{Number(metrics?.totalOverdueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {overdueInvoices.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">Zero Overdue Receivables!</p>
              <p className="text-xs text-slate-400 mt-1">All invoices are settled or within payment terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Aging Bracket</th>
                    <th className="py-3 px-4 text-right">Total Invoiced</th>
                    <th className="py-3 px-4 text-right">Balance Owed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-medium">
                        <div>{inv.customer?.companyName || inv.customer?.user?.name}</div>
                        <div className="text-[11px] text-slate-400">{inv.customer?.user?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-rose-600">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">{getAgingBadge(inv.dueDate)}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold font-mono text-rose-600 text-sm">
                        ₹{Number(inv.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={chasingId === inv.id}
                          onClick={() => handleSendReminder(inv.id)}
                          icon={<Send className="w-3.5 h-3.5" />}
                        >
                          Send Chase Email
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: RECONCILED COLLECTIONS LEDGER */}
      {activeTab === 'payments' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Reconciled Payments Ledger</h3>
              <p className="text-xs text-slate-500">
                Audited record of all inbound funds across Razorpay, Bank Transfer, UPI, and Cash.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Collected:</span>
              <span className="ml-2 font-mono font-bold text-emerald-600 text-sm">
                ₹{Number(metrics?.totalCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {collectionsLedger.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No payments recorded in this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Payment #</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Ref / Transaction ID</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {collectionsLedger.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{pay.paymentNumber}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(pay.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <div>{pay.customer?.companyName || pay.customer?.user?.name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                          {pay.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {pay.referenceNumber || pay.providerPaymentId || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                        ₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          pay.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700'
                            : pay.status === 'REFUNDED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: ACTIVE SUBSCRIPTIONS REGISTER */}
      {activeTab === 'subscriptions' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Active Subscriptions Register</h3>
              <p className="text-xs text-slate-500">
                Overview of current active recurring contracts and upcoming billing dates.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Active Contracts:</span>
              <span className="ml-2 font-mono font-bold text-indigo-600 text-sm">
                {activeSubscriptions.length}
              </span>
            </div>
          </div>

          {activeSubscriptions.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <RotateCw className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No active subscriptions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Subscription #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">Next Billing Date</th>
                    <th className="py-3 px-4 text-right">Recurring Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{sub.subscriptionNumber}</td>
                      <td className="py-3.5 px-4 font-medium">
                        <div>{sub.customer?.companyName || sub.customer?.user?.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{sub.plan?.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="uppercase font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {sub.billingFrequency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-indigo-600">
                        {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{Number(sub.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
