import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Layers,
  Loader2,
  Info,
  DollarSign,
  Percent,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

export const DiscountsPage: React.FC = () => {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: 'Introductory Launch Discount',
    code: 'LAUNCH20',
    discountType: 'PERCENTAGE',
    value: '20',
    minPurchaseAmount: '',
    minQuantity: '',
    usageLimit: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true,
  });

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/discounts');
      if (res.success && Array.isArray(res.data)) {
        setDiscounts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleOpenAdd = () => {
    setEditingDiscount(null);
    setFormData({
      name: '',
      code: '',
      discountType: 'PERCENTAGE',
      value: '10',
      minPurchaseAmount: '',
      minQuantity: '',
      usageLimit: '100',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (d: any) => {
    setEditingDiscount(d);
    setFormData({
      name: d.name,
      code: d.code,
      discountType: d.discountType,
      value: String(d.value),
      minPurchaseAmount: d.minPurchaseAmount ? String(d.minPurchaseAmount) : '',
      minQuantity: d.minQuantity ? String(d.minQuantity) : '',
      usageLimit: d.usageLimit ? String(d.usageLimit) : '',
      startDate: d.startDate ? new Date(d.startDate).toISOString().split('T')[0] : '',
      endDate: d.endDate ? new Date(d.endDate).toISOString().split('T')[0] : '',
      isActive: Boolean(d.isActive),
    });
    setModalOpen(true);
  };

  const handleToggleActive = async (d: any) => {
    try {
      await apiRequest(`/discounts/${d.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      fetchDiscounts();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase().replace(/\s+/g, '_'),
        discountType: formData.discountType,
        value: parseFloat(formData.value),
        minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : null,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity, 10) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        isActive: formData.isActive,
      };

      if (editingDiscount) {
        await apiRequest(`/discounts/${editingDiscount.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/discounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      fetchDiscounts();
    } catch (err: any) {
      alert(`Failed to save discount: ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-7 h-7 text-indigo-600" />
            Discount Rules & Promo Coupons
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated percentage reductions, coupon voucher redemption caps, and minimum purchase volume incentives.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Discount Rule
        </Button>
      </div>

      {/* Discount Rules Table */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading discount rules...</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No discount rules found</p>
            <p className="text-xs text-slate-400 mt-1">Create your first coupon voucher or volume incentive above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Coupon Code</th>
                  <th className="px-4 py-3">Discount Type</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-center">Thresholds</th>
                  <th className="px-4 py-3 text-center">Usage Count</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{d.name}</span>
                      {d.endDate && (
                        <span className="block text-[10px] text-slate-400">
                          Expires: {new Date(d.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{d.code}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {d.discountType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                      {d.discountType === 'PERCENTAGE' ? `${d.value}%` : `₹${d.value}`}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {d.minPurchaseAmount
                        ? `Min ₹${d.minPurchaseAmount}`
                        : d.minQuantity
                        ? `Min ${d.minQuantity} items`
                        : 'No min threshold'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className="text-slate-800 font-semibold">{d._count?.usages || 0}</span>
                      {d.usageLimit && (
                        <span className="text-slate-400 text-[10px]"> / {d.usageLimit} max</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(d)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          d.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {d.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(d)}
                        className="flex items-center gap-1.5 ml-auto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Discount Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDiscount ? 'Edit Discount Rule' : 'Create New Discount Rule'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Rule Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. 20% Startup Discount"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Promo Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. WELCOME20"
              required
            />

            <Select
              label="Discount Type *"
              value={formData.discountType}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage (%)' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount (₹)' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={formData.discountType === 'PERCENTAGE' ? 'Discount Rate (%) *' : 'Discount Amount (₹) *'}
              type="number"
              min="0"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              required
            />

            <Input
              label="Usage Cap Limit"
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Purchase (₹)"
              type="number"
              min="0"
              placeholder="e.g. 5000"
              value={formData.minPurchaseAmount}
              onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
            />

            <Input
              label="Min Quantity"
              type="number"
              min="1"
              placeholder="e.g. 3"
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />

            <Input
              label="End Date / Expiry"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveDiscount"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveDiscount" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Rule is Active and Redeemable
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingDiscount ? 'Update Rule' : 'Save Discount Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
