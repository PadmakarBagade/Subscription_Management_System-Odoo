import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle2, Download, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest, downloadPdf } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';

export const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Quotation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [lines, setLines] = useState<Array<{ productId: string; variantId: string; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [qRes, cRes, pRes, prRes] = await Promise.all([
        apiRequest('/quotations'),
        apiRequest('/customers?limit=100'),
        apiRequest('/plans'),
        apiRequest('/products'),
      ]);

      if (qRes.success && Array.isArray(qRes.data)) setQuotations(qRes.data);
      if (cRes.success && Array.isArray(cRes.data)) {
        setCustomers(cRes.data);
        if (cRes.data.length > 0) setSelectedCustomerId(cRes.data[0].id);
      }
      if (pRes.success && Array.isArray(pRes.data)) {
        setPlans(pRes.data);
        if (pRes.data.length > 0) setSelectedPlanId(pRes.data[0].id);
      }
      if (prRes.success && Array.isArray(prRes.data)) {
        setProducts(prRes.data);
        if (prRes.data.length > 0) {
          setLines([{ productId: prRes.data[0].id, variantId: '', quantity: 1 }]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiRequest('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          planId: selectedPlanId,
          validityDays: parseInt(validityDays, 10) || 30,
          lines: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            quantity: l.quantity,
          })),
        }),
      });

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmQuotation = async (quotationId: string) => {
    setConfirmingId(quotationId);
    try {
      const res = await apiRequest(`/quotations/${quotationId}/confirm`, {
        method: 'POST',
      });
      if (res.success) {
        alert('Quotation confirmed! Subscription has been successfully provisioned.');
        fetchData();
      }
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message || 'Error'}`);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Customer Quotations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prepare, dispatch, and convert formal commercial quotations into active software subscriptions.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Quotation
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No quotations generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Selected Plan</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Estimated Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {q.customer?.companyName || q.customer?.user?.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{q.plan?.name}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {new Date(q.validityDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{Number(q.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={q.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {q.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={confirmingId === q.id}
                          onClick={() => handleConfirmQuotation(q.id)}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Confirm & Provision
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPdf(`/quotations/${q.id}/pdf`, `Quotation-${q.quotationNumber}.pdf`)}
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

      {/* New Quotation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Prepare Commercial Quotation"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Select
            label="Target Customer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName ? `${c.companyName} (${c.user?.name})` : c.user?.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Subscription Plan"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billingFrequency} - ₹{p.basePrice})
                </option>
              ))}
            </Select>

            <Input
              label="Validity (Days)"
              type="number"
              min="1"
              required
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
            />
          </div>

          {/* Product Lines Section */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Line Items
            </p>
            {lines.map((line, idx) => {
              const currentProduct = products.find((p) => p.id === line.productId);
              return (
                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 mb-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      label="Product"
                      value={line.productId}
                      onChange={(e) => {
                        const copy = [...lines];
                        copy[idx].productId = e.target.value;
                        copy[idx].variantId = '';
                        setLines(copy);
                      }}
                    >
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name} (₹{pr.salesPrice})
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Variant (Adjustment)"
                      value={line.variantId}
                      onChange={(e) => {
                        const copy = [...lines];
                        copy[idx].variantId = e.target.value;
                        setLines(copy);
                      }}
                    >
                      <option value="">No Variant (+₹0)</option>
                      {currentProduct?.variants?.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.name}: {v.value} (+₹{v.priceAdjustment})
                        </option>
                      ))}
                    </Select>

                    <Input
                      label="Quantity"
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => {
                        const copy = [...lines];
                        copy[idx].quantity = parseInt(e.target.value, 10) || 1;
                        setLines(copy);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Generate Quotation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
