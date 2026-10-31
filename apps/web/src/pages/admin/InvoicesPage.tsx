import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Loader2,
  Mail,
} from 'lucide-react';
import { apiRequest, downloadPdf } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    notes: 'Standard 15-day payment term.',
    lines: [
      {
        productId: '',
        description: 'Monthly SaaS Services',
        quantity: 1,
        unitPrice: 1500,
      },
    ],
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = '/invoices?limit=50';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiRequest(url);
      if (res.success && Array.isArray(res.data)) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, search]);

  const loadCreateDependencies = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        apiRequest('/customers?limit=100'),
        apiRequest('/products?limit=100'),
      ]);
      if (custRes.success) setCustomers(custRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateModal = () => {
    loadCreateDependencies();
    setCreateModalOpen(true);
  };

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          productId: products[0]?.id || '',
          description: 'Software License',
          quantity: 1,
          unitPrice: 1000,
        },
      ],
    }));
  };

  const handleRemoveLine = (index: number) => {
    if (formData.lines.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, idx) => idx !== index),
    }));
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    setFormData((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: val };

      if (field === 'productId') {
        const prod = products.find((p) => p.id === val);
        if (prod) {
          newLines[index].description = prod.name;
          newLines[index].unitPrice = Number(prod.basePrice) || 0;
        }
      }

      return { ...prev, lines: newLines };
    });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert('Please select a customer.');
      return;
    }
    setCreateLoading(true);
    try {
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: formData.customerId,
          dueDate: new Date(formData.dueDate).toISOString(),
          notes: formData.notes,
          lines: formData.lines.map((l) => ({
            productId: l.productId,
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });

      setCreateModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      alert(`Failed to create invoice: ${err.message || 'Error'}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmInvoice = async (id: string) => {
    if (!window.confirm('Confirm this invoice? This locks invoice lines and calculates taxes.')) return;
    try {
      await apiRequest(`/invoices/${id}/confirm`, { method: 'POST' });
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        handleViewDetails(id);
      }
    } catch (err: any) {
      alert(`Failed to confirm: ${err.message}`);
    }
  };

  const handleCancelInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await apiRequest(`/invoices/${id}/cancel`, { method: 'POST' });
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        handleViewDetails(id);
      }
    } catch (err: any) {
      alert(`Failed to cancel: ${err.message}`);
    }
  };

  const handleSendInvoice = async (id: string) => {
    try {
      const res = await apiRequest(`/invoices/${id}/send`, { method: 'POST' });
      if (res.success) {
        alert(res.message || 'Invoice sent to customer successfully!');
      }
    } catch (err: any) {
      alert(`Failed to send invoice email: ${err.message}`);
    }
  };

  const handleViewDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await apiRequest(`/invoices/${id}`);
      if (res.success) {
        setSelectedInvoice(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string, balance: number) => {
    const isOverdue = Number(balance) > 0 && new Date(dueDate) < new Date() && status !== 'CANCELLED';
    if (isOverdue) return <Badge variant="danger">OVERDUE</Badge>;

    switch (status) {
      case 'PAID':
        return <Badge variant="success">PAID</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">PARTIALLY PAID</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info">CONFIRMED</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">DRAFT</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Billing Invoices & Receivables
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated recurring invoices, tax schedules, manual drafts, payment reconciliations, and PDF generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleOpenCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Draft Invoice
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['', 'CONFIRMED', 'PAID', 'OVERDUE', 'DRAFT', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st || 'All Invoices'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading billing invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No invoices found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search filters or generate a draft invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                      {inv.subscription && (
                        <span className="block text-[10px] text-indigo-600 font-sans font-medium">
                          Auto-bill ({inv.subscription.billingFrequency})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {inv.customer?.companyName || inv.customer?.user?.name || 'Customer'}
                      </p>
                      <p className="text-[11px] text-slate-400">{inv.customer?.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      ₹{Number(inv.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      ₹{Number(inv.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(inv.status, inv.dueDate, inv.balance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(inv.id)}
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadPdf(`/invoices/${inv.id}/pdf`, `Invoice-${inv.invoiceNumber}.pdf`)
                          }
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendInvoice(inv.id)}
                          title="Send Invoice Email"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        {inv.status === 'DRAFT' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmInvoice(inv.id)}
                            title="Confirm Invoice"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleCancelInvoice(inv.id)}
                            title="Cancel Invoice"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
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

      {/* View Invoice Details Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice Breakdown: ${selectedInvoice?.invoiceNumber || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Customer</span>
                <span className="font-bold text-slate-800">
                  {selectedInvoice.customer?.companyName || selectedInvoice.customer?.user?.name}
                </span>
                <span className="block text-[11px] text-slate-500">{selectedInvoice.customer?.user?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Issue / Due Date</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
                </span>
                <span className="block text-red-500 font-semibold">
                  Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total / Balance</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{Number(selectedInvoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="block text-amber-600 font-medium">
                  Outstanding: ₹{Number(selectedInvoice.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <div className="mt-1">
                  {getStatusBadge(selectedInvoice.status, selectedInvoice.dueDate, selectedInvoice.balance)}
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Itemized Products</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-slate-800">{line.description}</span>
                          {line.product?.sku && (
                            <span className="block text-[10px] text-slate-400">SKU: {line.product.sku}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">{line.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{Number(line.unitPrice).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                          ₹{Number(line.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Taxes and Totals Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="text-xs text-slate-500 max-w-sm">
                <span className="font-semibold text-slate-700 block mb-1">Notes:</span>
                <p className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  {selectedInvoice.notes || 'No customer notes attached to this invoice.'}
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                {selectedInvoice.taxes?.map((tax: any) => (
                  <div key={tax.id} className="flex justify-between text-slate-500">
                    <span>{tax.taxName} ({tax.taxRate}%):</span>
                    <span>₹{Number(tax.taxAmount).toFixed(2)}</span>
                  </div>
                ))}
                {Number(selectedInvoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{Number(selectedInvoice.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span>₹{Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                  <span>Amount Paid:</span>
                  <span>₹{Number(selectedInvoice.amountPaid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-700 font-bold bg-amber-50 p-1.5 rounded">
                  <span>Current Balance Due:</span>
                  <span>₹{Number(selectedInvoice.balance).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payments Allocation History */}
            {selectedInvoice.payments?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Recorded Payments & Settlements
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Payment #</th>
                        <th className="px-3 py-2 text-left">Method</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-mono">{p.paymentNumber}</td>
                          <td className="px-3 py-2">{p.paymentMethod}</td>
                          <td className="px-3 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600">
                            ₹{Number(p.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() =>
                  downloadPdf(
                    `/invoices/${selectedInvoice.id}/pdf`,
                    `Invoice-${selectedInvoice.invoiceNumber}.pdf`
                  )
                }
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSendInvoice(selectedInvoice.id)}
              >
                <Mail className="w-4 h-4 mr-1.5" />
                Send Email
              </Button>
              {selectedInvoice.status === 'DRAFT' && (
                <Button variant="primary" onClick={() => handleConfirmInvoice(selectedInvoice.id)}>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Confirm & Send Invoice
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Draft Invoice Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Draft Invoice"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Customer *"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              options={[
                { value: '', label: '-- Select Customer --' },
                ...customers.map((c) => ({
                  value: c.id,
                  label: `${c.companyName || c.user?.name} (${c.user?.email})`,
                })),
              ]}
              required
            />

            <Input
              label="Due Date *"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Invoice Notes / Terms"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Net 15 days, direct wire instructions..."
          />

          {/* Line Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase">Itemized Lines</label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>

            {formData.lines.map((line, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
              >
                <div className="sm:col-span-4">
                  <Select
                    value={line.productId}
                    onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                    options={[
                      { value: '', label: 'Custom Item' },
                      ...products.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={line.unitPrice}
                    onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={formData.lines.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createLoading}>
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Draft Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
