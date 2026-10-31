import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Play,
  RotateCw,
  Plus,
  Trash2,
  Tag,
  Percent,
  CheckCircle2,
  DollarSign,
  Layers,
  Loader2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

export const SimulatorPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<any[]>([]);
  const [loadingDependencies, setLoadingDependencies] = useState(true);

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('MONTHLY');
  const [discountCode, setDiscountCode] = useState('');
  const [selectedTaxRuleIds, setSelectedTaxRuleIds] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([
    { productId: '', variantId: '', quantity: 1 },
  ]);

  // Simulation Results
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoadingDependencies(true);
      try {
        const [plansRes, prodsRes, taxesRes] = await Promise.all([
          apiRequest('/plans'),
          apiRequest('/products?limit=100'),
          apiRequest('/taxes'),
        ]);

        if (plansRes.success) setPlans(plansRes.data);
        if (prodsRes.success) {
          setProducts(prodsRes.data);
          if (prodsRes.data.length > 0) {
            setItems([{ productId: prodsRes.data[0].id, variantId: '', quantity: 1 }]);
          }
        }
        if (taxesRes.success) {
          setTaxRules(taxesRes.data);
          // Auto select active GST rules
          const activeIds = taxesRes.data.filter((t: any) => t.isActive).map((t: any) => t.id);
          setSelectedTaxRuleIds(activeIds);
        }
      } catch (err) {
        console.error('Failed to load simulator data:', err);
      } finally {
        setLoadingDependencies(false);
      }
    };

    fetchDependencies();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: products[0]?.id || '', variantId: '', quantity: 1 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleToggleTax = (id: string) => {
    setSelectedTaxRuleIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !items[0].productId) {
      alert('Please add at least one product line.');
      return;
    }

    setCalculating(true);
    try {
      const res = await apiRequest('/simulator/calculate', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlanId || undefined,
          billingFrequency,
          discountCode: discountCode.trim() || undefined,
          taxRuleIds: selectedTaxRuleIds.length > 0 ? selectedTaxRuleIds : undefined,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || undefined,
            quantity: Number(i.quantity) || 1,
          })),
        }),
      });

      if (res.success) {
        setResult(res.data);
      }
    } catch (err: any) {
      alert(`Simulation calculation failed: ${err.message || 'Error'}`);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Calculator className="w-7 h-7 text-indigo-600" />
          Interactive Billing & Pricing Engine Simulator
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Model complex multi-tier pricing scenarios, coupon vouchers, intra-state GST splits, and frequency variations with live real-time recalculations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Simulation Parameters Form */}
        <div className="lg:col-span-7">
          <Card>
            <form onSubmit={handleRunSimulation} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Contract Configuration
                </span>
                <Badge variant="info">Pure Sandbox Mode</Badge>
              </div>

              {/* Subscription Plan & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Subscription Plan Tier (Optional)"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  options={[
                    { value: '', label: '-- No Plan Anchor (Custom Line Items) --' },
                    ...plans.map((p) => ({
                      value: p.id,
                      label: `${p.name} (₹${p.basePrice}/${p.billingFrequency.toLowerCase()})`,
                    })),
                  ]}
                />

                <Select
                  label="Billing Cadence *"
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value)}
                  options={[
                    { value: 'MONTHLY', label: 'Monthly' },
                    { value: 'QUARTERLY', label: 'Quarterly (3 Months)' },
                    { value: 'SEMI_ANNUAL', label: 'Semi-Annual (6 Months)' },
                    { value: 'ANNUAL', label: 'Annual (12 Months)' },
                  ]}
                  required
                />
              </div>

              {/* Itemized Products */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Products & Add-on Quantities
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                  </Button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                  >
                    <div className="sm:col-span-8">
                      <Select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.name} — Base: ₹${p.basePrice}`,
                        }))}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount Promo Code */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                  Coupon Voucher / Discount Code
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. LAUNCH20, ANNUAL10"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
              </div>

              {/* Tax Rules Toggles */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-2">
                  Applicable Tax Schedules
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {taxRules.map((t) => {
                    const isChecked = selectedTaxRuleIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTax(t.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>
                          {t.name} ({t.rate}%)
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 py-2.5 shadow-sm"
                  disabled={calculating || loadingDependencies}
                >
                  {calculating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  Calculate Billing Simulation
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Side: Simulation Breakdown Results */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Simulated Invoice Output
              </span>
              {result && <Badge variant="success">Engine Output</Badge>}
            </div>

            {!result ? (
              <div className="py-16 text-center text-slate-400">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-600">No calculation run yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Select products, frequency, or coupon codes and click Calculate to simulate live output.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Itemized lines breakdown */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.lines.map((l: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-800">{l.productName}</td>
                          <td className="px-3 py-2 text-center">{l.quantity}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            ₹{Number(l.lineSubtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal & Discount & Taxes */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹{result.subtotal.toFixed(2)}</span>
                  </div>

                  {result.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount ({result.discount?.ruleName || 'Promo'}):</span>
                      <span>-₹{result.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span>Net Taxable Base:</span>
                    <span className="font-semibold">₹{result.netTaxableAmount.toFixed(2)}</span>
                  </div>

                  {result.taxes.map((tx: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-slate-500">
                      <span>{tx.taxName} ({tx.taxRate}%):</span>
                      <span>₹{Number(tx.taxAmount).toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                    <span>Total Billing / Cycle:</span>
                    <span className="text-indigo-600">₹{result.totalAmount.toFixed(2)}</span>
                  </div>
                  <span className="block text-[11px] text-slate-400 text-right">
                    Billing Cycle: {result.billingFrequency}
                  </span>
                </div>

                {/* ARR Annualized comparison */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold mb-1">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Annualized Contract Value (ACV)</span>
                  </div>
                  <p className="text-slate-600">
                    Estimated annual run-rate at this tier:{' '}
                    <strong className="text-slate-900 font-mono text-sm">
                      ₹
                      {(
                        result.totalAmount *
                        (result.billingFrequency === 'MONTHLY'
                          ? 12
                          : result.billingFrequency === 'QUARTERLY'
                          ? 4
                          : result.billingFrequency === 'SEMI_ANNUAL'
                          ? 2
                          : 1)
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
