import React, { useState, useEffect } from 'react';
import { CalendarCheck, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Plan Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('MONTHLY');
  const [basePrice, setBasePrice] = useState('2500');
  const [minimumQuantity, setMinimumQuantity] = useState('1');
  const [autoClosePolicy, setAutoClosePolicy] = useState(false);
  const [allowPause, setAllowPause] = useState(true);
  const [allowEarlyClosure, setAllowEarlyClosure] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlansAndProducts = async () => {
    try {
      const [pRes, prRes] = await Promise.all([
        apiRequest('/plans?includeInactive=true'),
        apiRequest('/products'),
      ]);
      if (pRes.success && Array.isArray(pRes.data)) setPlans(pRes.data);
      if (prRes.success && Array.isArray(prRes.data)) {
        setProducts(prRes.data);
        if (prRes.data.length > 0) setSelectedProductId(prRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndProducts();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiRequest('/plans', {
        method: 'POST',
        body: JSON.stringify({
          name,
          code: code.toUpperCase().trim(),
          description,
          billingFrequency,
          basePrice: parseFloat(basePrice),
          minimumQuantity: parseInt(minimumQuantity, 10) || 1,
          autoClosePolicy,
          allowPause,
          allowEarlyClosure,
          allowRenewal,
          productIds: selectedProductId
            ? [{ productId: selectedProductId, defaultQuantity: 1, isRequired: true }]
            : [],
        }),
      });

      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      fetchPlansAndProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isAdmin
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              {isAdmin ? 'Plan Management' : 'Read-Only Catalog'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Configure frequencies (Daily, Weekly, Monthly, Yearly), pause rules, and pricing tiers.'
              : 'Browse active recurring subscription plans and policies for quotations.'}
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Subscription Plan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="text-center py-12 text-slate-500">
          <CalendarCheck className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm">No subscription plans created yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {p.code}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">{p.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {p.billingFrequency}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                  {p.description || 'No description specified'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    ₹{Number(p.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">/ cycle</span>
                </div>

                {/* Policies checklist */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Plan Policies
                  </p>
                  <div className="flex items-center gap-2 text-slate-600">
                    {p.autoClosePolicy ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    )}
                    <span>Auto-close when plan ends</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    {p.allowPause ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    )}
                    <span>Customer Pause Permitted</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    {p.allowEarlyClosure ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    )}
                    <span>Early Cancellation Allowed</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    {p.allowRenewal ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    )}
                    <span>Automatic Renewal Eligible</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Subscription Plan"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Plan Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth Business Suite"
            />
            <Input
              label="Plan Code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PLAN_GROWTH_BIZ"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Features and audience description..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Billing Frequency"
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value)}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </Select>

            <Input
              label="Base Price (₹)"
              type="number"
              step="0.01"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />

            <Input
              label="Min Quantity"
              type="number"
              min="1"
              required
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(e.target.value)}
            />
          </div>

          {products.length > 0 && (
            <Select
              label="Associated Primary Product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name} ({pr.code})
                </option>
              ))}
            </Select>
          )}

          {/* Policy Checkboxes */}
          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoClosePolicy}
                onChange={(e) => setAutoClosePolicy(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium">Auto-close subscription when plan period ends</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPause}
                onChange={(e) => setAllowPause(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium">Permit customer self-service pause</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEarlyClosure}
                onChange={(e) => setAllowEarlyClosure(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium">Allow early self-service cancellation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRenewal}
                onChange={(e) => setAllowRenewal(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium">Enable automatic billing cycle renewal</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Create Plan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
