import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  RotateCw,
  Receipt,
  CreditCard,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiRequest, downloadPdf } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { OperationalDashboard } from './OperationalDashboard';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'STAFF') {
    return <OperationalDashboard />;
  }

  const [metrics, setMetrics] = useState<any>(null);
  const [monthlyCollections, setMonthlyCollections] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any>(null);
  const [revenueByPlan, setRevenueByPlan] = useState<any[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [mRes, revRes, distRes, planRes, subRes, invRes] = await Promise.all([
          apiRequest('/reports/overview'),
          apiRequest('/reports/revenue'),
          apiRequest('/reports/status'),
          apiRequest('/reports/plans'),
          apiRequest('/subscriptions?limit=5'),
          apiRequest('/invoices?status=OVERDUE&limit=5'),
        ]);

        if (mRes.success) setMetrics(mRes.data);
        if (revRes.success) setMonthlyCollections(revRes.data);
        if (distRes.success) setStatusDistribution(distRes.data);
        if (planRes.success) setRevenueByPlan(planRes.data);
        if (subRes.success) setRecentSubscriptions(subRes.data);
        if (invRes.success) setOverdueInvoices(invRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Financial Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time subscriber metrics, recurring collections, and cash flow intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/admin/billing-jobs')}
            icon={<RotateCw className="w-4 h-4" />}
          >
            Billing Runs
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/admin/quotations')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Create Quotation
          </Button>
        </div>
      </div>

      {/* KPI Cards Row (Section 21) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Customers"
          value={metrics?.totalCustomers ?? 0}
          subtitle="Registered accounts"
          icon={<Users className="w-5 h-5" />}
          color="indigo"
        />

        <StatCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions ?? 0}
          subtitle={`+${metrics?.newSubscriptions30d ?? 0} new in 30 days`}
          icon={<RotateCw className="w-5 h-5" />}
          color="emerald"
        />

        <StatCard
          title="Total Invoiced"
          value={`₹${(metrics?.totalInvoiced ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="All issued invoices"
          icon={<Receipt className="w-5 h-5" />}
          color="slate"
        />

        <StatCard
          title="Collected Revenue"
          value={`₹${(metrics?.totalCollected ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Verified payments"
          icon={<CreditCard className="w-5 h-5" />}
          color="emerald"
        />

        <StatCard
          title="Outstanding Balance"
          value={`₹${(metrics?.totalOutstanding ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Total open receivables"
          icon={<Receipt className="w-5 h-5" />}
          color="amber"
        />

        <StatCard
          title="Overdue Invoices"
          value={metrics?.overdueInvoicesCount ?? 0}
          subtitle={`₹${(metrics?.totalOverdueAmount ?? 0).toLocaleString('en-IN')} overdue`}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="rose"
        />

        <StatCard
          title="Upcoming Renewals"
          value={metrics?.upcomingRenewalsCount ?? 0}
          subtitle="Next 7 days schedule"
          icon={<CalendarCheck className="w-5 h-5" />}
          color="indigo"
        />

        <StatCard
          title="Collection Rate"
          value={`${
            metrics?.totalInvoiced > 0
              ? Math.round((metrics.totalCollected / metrics.totalInvoiced) * 100)
              : 100
          }%`}
          subtitle="Invoiced vs Collected"
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* Visual Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collections Trend */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Collections Trend</h3>
              <p className="text-xs text-slate-500">Verified payment volume over time</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Actual Cash Flow
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCollections}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Invoice Distribution</h3>
            <p className="text-xs text-slate-500">Breakdown of invoice states</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusDistribution?.invoices?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution.invoices}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusDistribution.invoices.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No invoice records yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Revenue by Plan Bar Chart */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Revenue Contribution by Plan</h3>
            <p className="text-xs text-slate-500">Estimated recurring revenue from active subscriptions</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/admin/plans')}
          >
            Manage Plans
          </Button>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="planName" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Bar dataKey="estimatedRevenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Operational Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Recent Subscriptions</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/admin/subscriptions')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Sub #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Plan</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      {sub.customer?.companyName || sub.customer?.user?.name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{sub.plan?.name}</td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Overdue Invoices Requiring Action */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-sm text-slate-900">Overdue Invoices</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/admin/invoices?status=OVERDUE')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Manage Invoices
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4 text-right">Balance</th>
                  <th className="py-2.5 px-4 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {overdueInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No overdue invoices currently!
                    </td>
                  </tr>
                ) : (
                  overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-4 font-medium">
                        {inv.customer?.companyName || inv.customer?.user?.name}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                        ₹{Number(inv.balance).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => downloadPdf(`/invoices/${inv.id}/pdf`, `Invoice-${inv.invoiceNumber}.pdf`)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Download Invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
