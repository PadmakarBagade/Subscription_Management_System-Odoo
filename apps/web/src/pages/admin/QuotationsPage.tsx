import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Download,
  Loader2,
  AlertCircle,
  Copy,
  Layers,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { apiRequest, downloadPdf } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';

export const QuotationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quotations' | 'templates'>('quotations');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Quotation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [lines, setLines] = useState<Array<{ productId: string; variantId: string; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // New Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templatePlanId, setTemplatePlanId] = useState('');
  const [templateValidity, setTemplateValidity] = useState('30');
  const [templateLines, setTemplateLines] = useState<Array<{ productId: string; variantId: string; quantity: number; unitPrice: number }>>([]);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const fetchData = async () => {
    try {
      const [qRes, tRes, cRes, pRes, prRes] = await Promise.all([
        apiRequest('/quotations'),
        apiRequest('/quotation-templates'),
        apiRequest('/customers?limit=100'),
        apiRequest('/plans'),
        apiRequest('/products'),
      ]);

      if (qRes.success && Array.isArray(qRes.data)) setQuotations(qRes.data);
      if (tRes.success && Array.isArray(tRes.data)) setTemplates(tRes.data);
      if (cRes.success && Array.isArray(cRes.data)) {
        setCustomers(cRes.data);
        if (cRes.data.length > 0 && !selectedCustomerId) setSelectedCustomerId(cRes.data[0].id);
      }
      if (pRes.success && Array.isArray(pRes.data)) {
        setPlans(pRes.data);
        if (pRes.data.length > 0 && !selectedPlanId) setSelectedPlanId(pRes.data[0].id);
        if (pRes.data.length > 0 && !templatePlanId) setTemplatePlanId(pRes.data[0].id);
      }
      if (prRes.success && Array.isArray(prRes.data)) {
        setProducts(prRes.data);
        if (prRes.data.length > 0 && lines.length === 0) {
          setLines([{ productId: prRes.data[0].id, variantId: '', quantity: 1 }]);
          setTemplateLines([{ productId: prRes.data[0].id, variantId: '', quantity: 1, unitPrice: Number(prRes.data[0].salesPrice || 0) }]);
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

  // When a template is picked in New Quotation modal, prefill plan, validity & lines
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      if (tpl.defaultPlanId) setSelectedPlanId(tpl.defaultPlanId);
      if (tpl.validityDays) setValidityDays(String(tpl.validityDays));
      if (tpl.lines && tpl.lines.length > 0) {
        setLines(
          tpl.lines.map((l: any) => ({
            productId: l.productId,
            variantId: l.variantId || '',
            quantity: l.quantity || 1,
          }))
        );
      }
    }
  };

  const handleAddLine = () => {
    if (products.length > 0) {
      setLines([...lines, { productId: products[0].id, variantId: '', quantity: 1 }]);
    }
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

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
          templateId: selectedTemplateId || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            quantity: l.quantity,
          })),
        }),
      });

      setIsModalOpen(false);
      setSelectedTemplateId('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateSaving(true);
    setTemplateError('');

    try {
      await apiRequest('/quotation-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: templateName,
          description: templateDesc,
          defaultPlanId: templatePlanId || undefined,
          validityDays: parseInt(templateValidity, 10) || 30,
          lines: templateLines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || undefined,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        }),
      });

      setIsTemplateModalOpen(false);
      setTemplateName('');
      setTemplateDesc('');
      fetchData();
    } catch (err: any) {
      setTemplateError(err.message || 'Failed to create template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleConfirmQuotation = async (quotationId: string) => {
    setConfirmingId(quotationId);
    try {
      const res = await apiRequest(`/quotations/${quotationId}/confirm`, {
        method: 'POST',
      });
      if (res.success) {
        alert('Quotation confirmed! Software subscription has been provisioned.');
        fetchData();
      }
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message || 'Error'}`);
    } finally {
      setConfirmingId(null);
    }
  };

  // Calculate live preview estimate
  const estimatedSubtotal = lines.reduce((acc, line) => {
    const prod = products.find((p) => p.id === line.productId);
    const base = Number(prod?.salesPrice || 0);
    const variant = prod?.variants?.find((v: any) => v.id === line.variantId);
    const adj = Number(variant?.priceAdjustment || 0);
    return acc + (base + adj) * (line.quantity || 1);
  }, 0);
  const estimatedTax = Number((estimatedSubtotal * 0.18).toFixed(2));
  const estimatedTotal = estimatedSubtotal + estimatedTax;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Quotations & Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build bespoke commercial proposals or fast-track offers using pre-configured quotation templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'templates' ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsTemplateModalOpen(true)}
            >
              New Template
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                icon={<Layers className="w-4 h-4" />}
                onClick={() => {
                  setSelectedTemplateId(templates[0]?.id || '');
                  if (templates[0]) handleTemplateSelect(templates[0].id);
                  setIsModalOpen(true);
                }}
              >
                Quote from Template
              </Button>
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setSelectedTemplateId('');
                  setIsModalOpen(true);
                }}
              >
                Create Quotation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('quotations')}
          className={`pb-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'quotations'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Active Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Quotation Templates ({templates.length})
        </button>
      </div>

      {/* Quotations List Tab */}
      {activeTab === 'quotations' && (
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm">No quotations generated yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Start from a quotation template or build an offer from scratch.
              </p>
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
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {tpl.name}
                  </h3>
                  <Badge variant="neutral">{tpl.validityDays} Days Valid</Badge>
                </div>
                <p className="text-xs text-slate-500 mb-4">{tpl.description || 'Pre-configured commercial quote package'}</p>

                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Default Plan</div>
                  <div className="text-xs font-bold text-slate-800">{tpl.defaultPlan?.name || 'Any Plan'}</div>

                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-2">Included Lines ({tpl.lines?.length || 0})</div>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {tpl.lines?.map((line: any, i: number) => (
                      <li key={i} className="flex justify-between">
                        <span>
                          {line.quantity}x {line.product?.name}
                          {line.variant && ` (${line.variant.name}: ${line.variant.value})`}
                        </span>
                        <span className="font-mono text-slate-900 font-semibold">₹{Number(line.unitPrice).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  handleTemplateSelect(tpl.id);
                  setActiveTab('quotations');
                  setIsModalOpen(true);
                }}
              >
                Use This Template
              </Button>
            </Card>
          ))}
        </div>
      )}

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

          {/* Optional Template Starter */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-1.5">
            <label className="block text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Start from Quotation Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full text-xs bg-white border border-indigo-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Build from scratch (No Template) --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.validityDays} days, {tpl.defaultPlan?.name || 'Default'})
                </option>
              ))}
            </select>
            {selectedTemplateId && (
              <p className="text-[11px] text-indigo-700">
                Template applied! Plan, validity period, and product lines pre-filled below.
              </p>
            )}
          </div>

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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Product Line Items
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={handleAddLine} icon={<Plus className="w-3 h-3" />}>
                Add Line
              </Button>
            </div>

            {lines.map((line, idx) => {
              const currentProduct = products.find((p) => p.id === line.productId);
              return (
                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 mb-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
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
                    </div>

                    <div className="sm:col-span-4">
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
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Qty"
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

                    <div className="sm:col-span-1 pt-4 text-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live Pricing Breakdown */}
            <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Calculated Subtotal:</span>
                <span className="font-mono font-medium">₹{estimatedSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated GST (18%):</span>
                <span className="font-mono font-medium">₹{estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                <span>Estimated Grand Total:</span>
                <span className="font-mono text-indigo-600">₹{estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
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

      {/* New Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create New Quotation Template"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          {templateError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {templateError}
            </div>
          )}

          <Input
            label="Template Name"
            required
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Enterprise Cloud Suite - 30 Day Offer"
          />

          <Input
            label="Description / Pitch"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            placeholder="e.g. Turnkey ERP package for mid-market clients"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Default Plan"
              value={templatePlanId}
              onChange={(e) => setTemplatePlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billingFrequency})
                </option>
              ))}
            </Select>

            <Input
              label="Standard Validity (Days)"
              type="number"
              min="1"
              value={templateValidity}
              onChange={(e) => setTemplateValidity(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={templateSaving}>
              Save Quotation Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
