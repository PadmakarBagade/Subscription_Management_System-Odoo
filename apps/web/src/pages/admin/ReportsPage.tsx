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

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any>(null);
  const [planRevenue, setPlanRevenue] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllReports = async () => {
      setLoading(true);
      try {
        const [overviewRes, revenueRes, statusRes, plansRes] = await Promise.all([
          apiRequest('/reports/overview'),
          apiRequest('/reports/revenue'),
          apiRequest('/reports/status'),
          apiRequest('/reports/plans'),
        ]);

        if (overviewRes.success) setMetrics(overviewRes.data);
        if (revenueRes.success) setRevenueTrend(revenueRes.data);
        if (statusRes.success) setDistribution(statusRes.data);
        if (plansRes.success) setPlanRevenue(plansRes.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllReports();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Aggregating financial metrics & charts...</p>
      </div>
    );
  }

  // Format subscription status data for Pie chart
  const subscriptionChartData =
    distribution?.subscriptions?.map((s: any) => ({
      name: s.status,
      value: s.count,
    })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-indigo-600" />
          Executive Financial Reports & Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time aggregates of recurring billing collections, accounts receivable aging, churn indicators, and plan distribution.
        </p>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${Number(metrics?.totalInvoiced || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })}`}
          icon={Receipt}
          description="Cumulative billings issued"
        />
        <StatCard
          title="Total Collected"
          value={`₹${Number(metrics?.totalCollected || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })}`}
          icon={DollarSign}
          description="Reconciled cash & online payments"
        />
        <StatCard
          title="Outstanding Balance"
          value={`₹${Number(metrics?.totalOutstanding || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
          })}`}
          icon={TrendingUp}
          description="Open unpaid receivables"
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

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Subscriptions</p>
            <p className="text-2xl font-bold text-slate-900">{metrics?.activeSubscriptions || 0}</p>
            <p className="text-[11px] text-slate-400">+{metrics?.newSubscriptions30d || 0} in past 30 days</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Registered Customers</p>
            <p className="text-2xl font-bold text-slate-900">{metrics?.totalCustomers || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium">B2B & Individual profiles</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Renewals in Next 7 Days</p>
            <p className="text-2xl font-bold text-slate-900">{metrics?.upcomingRenewalsCount || 0}</p>
            <p className="text-[11px] text-slate-400">Scheduled for automated billing</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Collections Trend */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Monthly Collections Trend (₹)</h3>
              <p className="text-xs text-slate-400">Actual reconciled payments per month</p>
            </div>
            <Badge variant="success">Past 12 Months</Badge>
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

        {/* Subscription Status Distribution */}
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
            <p className="text-xs text-slate-400">
              Contract value generated by currently active subscriptions
            </p>
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
  );
};
