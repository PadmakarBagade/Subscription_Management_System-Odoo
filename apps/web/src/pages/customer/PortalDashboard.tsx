import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCw, Receipt, CreditCard, ArrowRight, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, downloadPdf, openRazorpayCheckout } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const PortalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [subRes, invRes] = await Promise.all([
          apiRequest('/subscriptions?limit=5'),
          apiRequest('/invoices?limit=5'),
        ]);

        if (subRes.success) setSubscriptions(subRes.data);
        if (invRes.success) setInvoices(invRes.data);
      } catch (err) {
        console.error('Failed to load portal dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
  const activeSubsCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;

  const handlePayNow = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      // 1. Create order on backend
      const orderRes = await apiRequest('/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error('Failed to create payment order');
      }

      const orderData = orderRes.data;

      // 2. Open Razorpay Checkout modal
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
          // 3. Verify on backend
          await apiRequest('/payments/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId,
            }),
          });
          // Reload
          window.location.reload();
        },
      });
    } catch (err: any) {
      alert(`Payment error: ${err.message || 'Payment initiation failed'}`);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-indigo-300">
            Customer Self-Service Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {user?.customerProfile?.companyName || 'Manage your subscriptions and billing statements'}
          </p>
        </div>

        {totalOutstanding > 0 && (
          <div className="bg-rose-500/20 border border-rose-400/30 p-4 rounded-xl text-right">
            <span className="text-xs text-rose-200 block">Total Outstanding Balance</span>
            <span className="text-2xl font-bold text-white block mt-0.5">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Subscriptions</span>
            <RotateCw className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{activeSubsCount}</p>
          <p className="text-xs text-slate-400 mt-1">Managed automatically</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Unpaid Invoices</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {invoices.filter((i) => Number(i.balance) > 0).length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Due for renewal</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Payment Security</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">Razorpay Verified</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">✓ End-to-end encrypted</p>
        </Card>
      </div>

      {/* Active Subscriptions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Current Subscriptions</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/portal/subscriptions')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All
          </Button>
        </div>

        {subscriptions.length === 0 ? (
          <Card className="text-center py-10 text-slate-500">
            <RotateCw className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">You do not have any active subscriptions yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="border-l-4 border-l-indigo-600">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400">{sub.subscriptionNumber}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{sub.plan?.name}</h3>
                  </div>
                  <Badge status={sub.status} />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Billing Cycle:</span>{' '}
                    <span className="font-semibold text-slate-800">{sub.billingFrequency}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Amount:</span>{' '}
                    <span className="font-bold text-slate-900">
                      ₹{Number(sub.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {sub.nextBillingDate && (
                  <p className="mt-2 text-xs text-slate-500">
                    Next billing date:{' '}
                    <span className="font-medium text-slate-700">
                      {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </span>
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invoices & Receipts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Invoices & Receipts</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/portal/invoices')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All Invoices
          </Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right font-medium">₹{Number(inv.totalAmount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{Number(inv.balance).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {Number(inv.balance) > 0 && inv.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={payingInvoiceId === inv.id}
                          onClick={() => handlePayNow(inv.id)}
                        >
                          Pay Now
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
        </Card>
      </div>
    </div>
  );
};
