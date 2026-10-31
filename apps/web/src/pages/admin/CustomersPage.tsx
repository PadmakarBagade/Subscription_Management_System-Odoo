import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  Loader2,
  ArrowRight,
  Receipt,
  RotateCw,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBalanceOnly, setFilterBalanceOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [meta, setMeta] = useState<{
    total: number;
    totalReceivables: number;
    customersWithBalanceCount: number;
  }>({
    total: 0,
    totalReceivables: 0,
    customersWithBalanceCount: 0,
  });

  // New Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    billingAddress: '',
    taxId: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Selected customer for full detail view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = `/customers?page=${page}&limit=10&sortBy=balance`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterBalanceOnly) url += `&hasBalance=true`;

      const res = await apiRequest(url);
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setMeta({
            total: res.meta.total || 0,
            totalReceivables: Number(res.meta.totalReceivables || 0),
            customersWithBalanceCount: Number(res.meta.customersWithBalanceCount || 0),
          });
        }
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, filterBalanceOnly]);

  const handleOpenDetail = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingDetail(true);
    try {
      const res = await apiRequest(`/customers/${customerId}`);
      if (res.success) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer details', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(modalForm),
      });

      if (res.success) {
        setFormSuccess('Customer profile created successfully!');
        setModalForm({
          name: '',
          email: '',
          companyName: '',
          phone: '',
          billingAddress: '',
          taxId: '',
        });
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess('');
          fetchCustomers();
        }, 1200);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Customer & Account Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Subscriber directory, real-time outstanding balances, tax IDs, and billing statements.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setFormError('');
            setFormSuccess('');
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          Add Customer
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Receivables (Dues)"
          value={`₹${meta.totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Unpaid & overdue customer balances"
          icon={<CreditCard className="w-5 h-5" />}
          color="rose"
        />

        <StatCard
          title="Accounts with Dues"
          value={meta.customersWithBalanceCount}
          subtitle="Subscribers with active invoice balances"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
        />

        <StatCard
          title="Total Subscribers"
          value={meta.total}
          subtitle="Registered customer profiles"
          icon={<Users className="w-5 h-5" />}
          color="indigo"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customer name, company, email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => {
              setFilterBalanceOnly(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              !filterBalanceOnly
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Customers ({meta.total})
          </button>
          <button
            onClick={() => {
              setFilterBalanceOnly(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              filterBalanceOnly
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>With Dues Only</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
              {meta.customersWithBalanceCount}
            </span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <Card className="p-0 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterBalanceOnly
                ? 'No customers currently have unpaid or overdue balances.'
                : 'Try adjusting your search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer / Contact</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">GSTIN / Tax ID</th>
                  <th className="py-3 px-4 text-center">Subscriptions</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map((c) => {
                  const balanceNum = Number(c.outstandingBalance || 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 text-sm">{c.user?.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.user?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {c.companyName || <span className="text-slate-400 italic">Individual Account</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {c.taxId || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                          {c._count?.subscriptions ?? 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-sm">
                        <span
                          className={`font-mono px-2 py-0.5 rounded-md ${
                            balanceNum > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold'
                              : 'text-emerald-700'
                          }`}
                        >
                          ₹{balanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(c.id)}
                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                          className="hover:border-indigo-400 text-indigo-700"
                        >
                          View Statement
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({meta.total} records)
            </span>
            <div className="space-x-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-md border border-slate-300 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-md border border-slate-300 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Customer Profile"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <Input
            label="Contact Full Name"
            type="text"
            required
            value={modalForm.name}
            onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
            placeholder="e.g. Michael Scott"
          />

          <Input
            label="Email Address (Login Username)"
            type="email"
            required
            value={modalForm.email}
            onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
            placeholder="michael@dundermifflin.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              type="text"
              value={modalForm.companyName}
              onChange={(e) => setModalForm({ ...modalForm, companyName: e.target.value })}
              placeholder="Dunder Mifflin Paper Co."
            />
            <Input
              label="Phone Number"
              type="tel"
              value={modalForm.phone}
              onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
              placeholder="+91 98765 00000"
            />
          </div>

          <Input
            label="GSTIN / Tax ID"
            type="text"
            value={modalForm.taxId}
            onChange={(e) => setModalForm({ ...modalForm, taxId: e.target.value })}
            placeholder="e.g. 29ABCDE1234F1Z5"
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Registered Billing Address
            </label>
            <textarea
              rows={3}
              value={modalForm.billingAddress}
              onChange={(e) => setModalForm({ ...modalForm, billingAddress: e.target.value })}
              placeholder="Full physical address for invoice dispatch..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Full Statement & Detail Modal */}
      {selectedCustomerId && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedCustomerId(null);
            setCustomerDetail(null);
          }}
          title={
            customerDetail
              ? `Account: ${customerDetail.companyName || customerDetail.user?.name}`
              : 'Customer Account Statement'
          }
          maxWidth="2xl"
        >
          {loadingDetail || !customerDetail ? (
            <div className="py-16 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-5 text-xs text-slate-700">
              {/* Highlight Balance Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  Number(customerDetail.outstandingBalance || 0) > 0
                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                }`}
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-600">
                    Outstanding Balance Due
                  </span>
                  <span className="text-2xl font-extrabold font-mono mt-0.5 block">
                    ₹{Number(customerDetail.outstandingBalance || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    Number(customerDetail.outstandingBalance || 0) > 0
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {Number(customerDetail.outstandingBalance || 0) > 0 ? 'Dues Pending' : 'Settled in Full'}
                </span>
              </div>

              {/* Profile Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Contact</span>
                  <span className="font-semibold text-slate-900">{customerDetail.user?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Work Email</span>
                  <span className="font-semibold text-slate-900 font-mono text-[11px] truncate block">
                    {customerDetail.user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-medium text-slate-800">{customerDetail.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTIN / Tax ID</span>
                  <span className="font-mono text-slate-900">{customerDetail.taxId || 'N/A'}</span>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <span className="text-slate-500 font-semibold text-xs block mb-1">Billing Address</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
                  {customerDetail.billingAddress || 'No billing address specified.'}
                </p>
              </div>

              {/* Subscriptions section */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                  Active & Historical Contracts ({customerDetail.subscriptions?.length || 0})
                </h4>
                {customerDetail.subscriptions && customerDetail.subscriptions.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {customerDetail.subscriptions.map((s: any) => (
                      <div key={s.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                        <div>
                          <span className="font-bold font-mono text-indigo-600 block">{s.subscriptionNumber}</span>
                          <span className="text-[11px] text-slate-500">{s.plan?.name} • {s.billingFrequency}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold block">₹{Number(s.totalAmount).toFixed(2)}</span>
                          <Badge status={s.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No subscriptions registered.</p>
                )}
              </div>

              {/* Invoices section */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  Invoices & Statements ({customerDetail.invoices?.length || 0})
                </h4>
                {customerDetail.invoices && customerDetail.invoices.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {customerDetail.invoices.map((inv: any) => (
                      <div key={inv.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                        <div>
                          <span className="font-bold font-mono text-slate-900 block">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-slate-400">
                            Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-mono font-bold block text-slate-900">
                              ₹{Number(inv.totalAmount).toFixed(2)}
                            </span>
                            {Number(inv.balance) > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                Due: ₹{Number(inv.balance).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <Badge status={inv.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No invoices recorded.</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setCustomerDetail(null);
                  }}
                >
                  Close Statement
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
