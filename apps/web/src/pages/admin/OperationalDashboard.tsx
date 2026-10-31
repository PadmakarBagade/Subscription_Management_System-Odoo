import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  RotateCw,
  Receipt,
  CreditCard,
  AlertTriangle,
  CalendarCheck,
  ArrowRight,
  Loader2,
  FileText,
  UserPlus,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { apiRequest } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const OperationalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOperationalData() {
      try {
        const res = await apiRequest('/reports/operational');
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load operational metrics', err);
      } finally {
        setLoading(false);
      }
    }
    loadOperationalData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

  const statusDistributionData = (data?.subscriptionStatusDistribution || []).map((s: any) => ({
    name: s.status,
    value: s.count,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Quick Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Staff Operational Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Subscriber Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time subscriber status, draft invoices awaiting confirmation, upcoming renewals, and collection chase list.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/admin/customers')}
            className="flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Customers</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/admin/quotations')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <FileText className="w-4 h-4" />
            <span>Quotations</span>
          </Button>
        </div>
      </div>

      {/* Primary Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={data?.activeSubscriptionsCount || 0}
          icon={RotateCw}
          color="indigo"
          description="Live billing accounts"
        />
        <StatCard
          title="Total Customers"
          value={data?.totalCustomers || 0}
          icon={Users}
          color="emerald"
          description="Managed profiles"
        />
        <StatCard
          title="Invoices Awaiting Review"
          value={data?.invoicesAwaitingConfirmationCount || 0}
          icon={Receipt}
          color="amber"
          description="Drafts pending confirm"
        />
        <StatCard
          title="Total Outstanding"
          value={`₹${(data?.totalOutstandingAmount || 0).toLocaleString()}`}
          icon={CreditCard}
          color="slate"
          description="Uncollected balance"
        />
        <StatCard
          title="Overdue Invoices"
          value={data?.overdueInvoices?.count || 0}
          icon={AlertTriangle}
          color="rose"
          description={`₹${(data?.overdueInvoices?.totalAmount || 0).toLocaleString()} overdue`}
        />
        <StatCard
          title="Upcoming Renewals"
          value={data?.upcomingRenewals?.count || 0}
          icon={CalendarCheck}
          color="indigo"
          description="Next 7 days renewals"
        />
      </div>

      {/* Status Distribution & Overdue Chase List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subscription Status Breakdown */}
        <div className="lg:col-span-5">
          <Card>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Subscription Status Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              {statusDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusDistributionData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} subscriptions`, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400">No active subscription data</p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {statusDistributionData.map((item: any, idx: number) => (
                <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-medium text-slate-700 truncate">{item.name}</span>
                  <span className="ml-auto font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Overdue Collection Chase List */}
        <div className="lg:col-span-7">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Overdue Invoices — Chase List</h3>
              <Link to="/admin/invoices?status=OVERDUE" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {(!data?.overdueInvoices?.chaseList || data.overdueInvoices.chaseList.length === 0) ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-slate-600">Great news! No overdue invoices outstanding.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                      <th className="py-2.5 px-3 font-semibold">Customer</th>
                      <th className="py-2.5 px-3 font-semibold">Due Date</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.overdueInvoices.chaseList.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          <Link to="/admin/invoices" className="hover:text-indigo-600 hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900 truncate max-w-[140px]">{inv.companyName || inv.customerName}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{inv.email}</p>
                        </td>
                        <td className="py-3 px-3 text-rose-600 font-medium">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-rose-700">
                          ₹{Number(inv.balance).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {inv.phone && (
                              <a
                                href={`tel:${inv.phone}`}
                                title={inv.phone}
                                className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {inv.email && (
                              <a
                                href={`mailto:${inv.email}`}
                                title={inv.email}
                                className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Recent Payments & Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments Log */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Recent Payments</h3>
            <Link to="/admin/payments" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              <span>All Payments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(!data?.recentPayments || data.recentPayments.length === 0) ? (
            <p className="py-8 text-center text-sm text-slate-400">No payment activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Payment #</th>
                    <th className="py-2.5 px-3 font-semibold">Customer</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {p.paymentNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[120px]">
                        {p.companyName || p.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={p.status === 'SUCCESS' ? 'success' : p.status === 'REFUNDED' ? 'danger' : 'neutral'}
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Upcoming Renewals Schedule */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Upcoming Renewals (Next 7 Days)</h3>
            <Link to="/admin/subscriptions" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              <span>All Subscriptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(!data?.upcomingRenewals?.list || data.upcomingRenewals.list.length === 0) ? (
            <p className="py-8 text-center text-sm text-slate-400">No renewals scheduled for the next 7 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Subscription #</th>
                    <th className="py-2.5 px-3 font-semibold">Customer</th>
                    <th className="py-2.5 px-3 font-semibold">Plan</th>
                    <th className="py-2.5 px-3 font-semibold">Renewal Date</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Cycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.upcomingRenewals.list.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        <Link to="/admin/subscriptions" className="hover:text-indigo-600 hover:underline">
                          {sub.subscriptionNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[120px]">
                        {sub.companyName || sub.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {sub.planName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="info">
                          {sub.billingFrequency}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
