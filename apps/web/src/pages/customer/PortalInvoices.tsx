import React, { useState, useEffect } from 'react';
import { Receipt, Download, CreditCard, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, downloadPdf, openRazorpayCheckout } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const PortalInvoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      let url = '/invoices';
      if (statusFilter) url += `?status=${statusFilter}`;
      const res = await apiRequest(url);
      if (res.success && Array.isArray(res.data)) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handlePay = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const orderRes = await apiRequest('/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error('Failed to create payment order');
      }

      const orderData = orderRes.data;

      openRazorpayCheckout({
        keyId: orderData.keyId,
        orderId: orderData.orderId,
        amountInPaise: orderData.amountInPaise,
        currency: orderData.currency,
        name: 'Brightloop Software',
        description: `Invoice Payment #${invoiceId.slice(-6)}`,
        customerName: user?.name,
        customerEmail: user?.email,
        onSuccess: async (response) => {
          await apiRequest('/payments/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId,
            }),
          });
          fetchInvoices();
        },
      });
    } catch (err: any) {
      alert(`Payment error: ${err.message || 'Payment initiation failed'}`);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Invoices & Tax Receipts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Download official tax invoices, check outstanding balances, and complete online payments.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {['', 'CONFIRMED', 'OVERDUE', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st || 'All Invoices'}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Receipt className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No invoices found for the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Taxes (GST)</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-medium">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">₹{Number(inv.subtotal).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-500">₹{Number(inv.taxAmount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{Number(inv.totalAmount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={Number(inv.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        ₹{Number(inv.balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {Number(inv.balance) > 0 && inv.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={payingInvoiceId === inv.id}
                          onClick={() => handlePay(inv.id)}
                          icon={<CreditCard className="w-3.5 h-3.5" />}
                        >
                          Pay Online
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPdf(`/invoices/${inv.id}/pdf`, `Invoice-${inv.invoiceNumber}.pdf`)}
                        icon={<Download className="w-3.5 h-3.5" />}
                      >
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
