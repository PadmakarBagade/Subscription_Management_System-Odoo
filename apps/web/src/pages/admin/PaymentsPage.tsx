import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Record Manual Payment Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    invoiceId: '',
    paymentMethod: 'BANK_TRANSFER',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: 'Direct NEFT / RTGS settlement verified by finance.',
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/payments?limit=50');
      if (res.success && Array.isArray(res.data)) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleOpenRecordModal = async () => {
    try {
      // Fetch open invoices that have an outstanding balance
      const res = await apiRequest('/invoices?limit=100');
      if (res.success && Array.isArray(res.data)) {
        const eligible = res.data.filter((inv: any) => Number(inv.balance) > 0 && inv.status !== 'CANCELLED');
        setInvoices(eligible);
        if (eligible.length > 0) {
          setFormData((prev) => ({
            ...prev,
            invoiceId: eligible[0].id,
            amount: String(eligible[0].balance),
          }));
        }
      }
      setRecordModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvoiceSelect = (invId: string) => {
    const inv = invoices.find((i) => i.id === invId);
    setFormData((prev) => ({
      ...prev,
      invoiceId: invId,
      amount: inv ? String(inv.balance) : '',
    }));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceId) {
      alert('Please select an outstanding invoice');
      return;
    }

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setRecordLoading(true);
    try {
      await apiRequest('/payments/manual', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          paymentMethod: formData.paymentMethod,
          amount: amt,
          paymentDate: new Date(formData.paymentDate).toISOString(),
          referenceNumber: formData.referenceNumber || undefined,
          notes: formData.notes,
        }),
      });

      setRecordModalOpen(false);
      fetchPayments();
      alert('Manual payment recorded and applied successfully!');
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message || 'Error'}`);
    } finally {
      setRecordLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const term = search.toLowerCase();
    const pNum = p.paymentNumber?.toLowerCase() || '';
    const iNum = p.invoice?.invoiceNumber?.toLowerCase() || '';
    const custName = p.customer?.companyName?.toLowerCase() || p.customer?.user?.name?.toLowerCase() || '';
    const refNum = p.referenceNumber?.toLowerCase() || '';
    return pNum.includes(term) || iNum.includes(term) || custName.includes(term) || refNum.includes(term);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Payment Transactions & Settlements
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative financial ledger tracking Razorpay webhooks, UPI, Netbanking, and authorized staff manual settlements.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenRecordModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Offline Payment
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payment #, invoice, customer, reference UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading payment transactions...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No payment transactions found</p>
            <p className="text-xs text-slate-400 mt-1">Transactions will appear as customers pay or staff records offline payments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Payment #</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference / UTR</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {p.paymentNumber}
                      {p.isStaffRecorded && (
                        <span className="block text-[10px] text-indigo-600 font-sans font-medium">
                          Staff Recorded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {p.invoice?.invoiceNumber || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {p.customer?.companyName || p.customer?.user?.name || 'Customer'}
                      </p>
                      <p className="text-[11px] text-slate-400">{p.customer?.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {p.referenceNumber || 'Auto-reconciled'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.status === 'SUCCESS' ? 'success' : 'danger'}>
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

      {/* Record Offline Payment Modal */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record Authorized Manual Offline Payment"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              This action records verified funds received outside of Razorpay (direct NEFT, RTGS, Cash, Cheque) and immediately applies reconciliation to the outstanding invoice balance.
            </p>
          </div>

          <Select
            label="Target Invoice with Balance *"
            value={formData.invoiceId}
            onChange={(e) => handleInvoiceSelect(e.target.value)}
            options={[
              { value: '', label: '-- Select Outstanding Invoice --' },
              ...invoices.map((i) => ({
                value: i.id,
                label: `${i.invoiceNumber} — ${i.customer?.companyName || i.customer?.user?.name} (Balance: ₹${i.balance})`,
              })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method *"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              options={[
                { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
                { value: 'UPI', label: 'Direct UPI' },
                { value: 'CASH', label: 'Cash Settlement' },
                { value: 'CHEQUE', label: 'Cheque / Demand Draft' },
              ]}
              required
            />

            <Input
              label="Payment Amount (₹) *"
              type="number"
              min="1"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Settlement Date *"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              required
            />

            <Input
              label="Bank Reference / UTR #"
              placeholder="e.g. UTR293849102"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            />
          </div>

          <Input
            label="Internal Notes / Audit Justification"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Verified bank statement credit..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={recordLoading}>
              {recordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm & Post Settlement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
