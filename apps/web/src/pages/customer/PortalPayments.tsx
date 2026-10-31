import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';

export const PortalPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      try {
        const res = await apiRequest('/payments');
        if (res.success && Array.isArray(res.data)) {
          setPayments(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Payment History
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review all verified online transactions and recorded offline manual payments.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No payment records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Applied to Invoice</th>
                  <th className="py-3 px-4">Provider Reference</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {p.paymentNumber}
                    </td>
                    <td className="py-3.5 px-4">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-indigo-600">
                      {p.invoice?.invoiceNumber || 'Account Balance'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.providerPaymentId || p.referenceNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={p.status} />
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
