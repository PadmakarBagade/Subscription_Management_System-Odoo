import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Edit2,
  Check,
  X,
  ShieldCheck,
  Loader2,
  Info,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';

export const TaxesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: 'Goods & Services Tax 18%',
    code: 'GST_18',
    taxType: 'GST',
    rate: '18',
    isGst: true,
    cgstRate: '9',
    sgstRate: '9',
    igstRate: '18',
    priority: '10',
    isActive: true,
  });

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/taxes');
      if (res.success && Array.isArray(res.data)) {
        setTaxes(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch taxes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleOpenAdd = () => {
    setEditingTax(null);
    setFormData({
      name: '',
      code: '',
      taxType: 'GST',
      rate: '18',
      isGst: true,
      cgstRate: '9',
      sgstRate: '9',
      igstRate: '18',
      priority: '10',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (tax: any) => {
    setEditingTax(tax);
    setFormData({
      name: tax.name,
      code: tax.code,
      taxType: tax.taxType,
      rate: String(tax.rate),
      isGst: Boolean(tax.isGst),
      cgstRate: String(tax.cgstRate || ''),
      sgstRate: String(tax.sgstRate || ''),
      igstRate: String(tax.igstRate || ''),
      priority: String(tax.priority || '10'),
      isActive: Boolean(tax.isActive),
    });
    setModalOpen(true);
  };

  const handleToggleActive = async (tax: any) => {
    try {
      await apiRequest(`/taxes/${tax.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !tax.isActive }),
      });
      fetchTaxes();
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
        taxType: formData.taxType,
        rate: parseFloat(formData.rate),
        isGst: formData.isGst,
        cgstRate: formData.cgstRate ? parseFloat(formData.cgstRate) : null,
        sgstRate: formData.sgstRate ? parseFloat(formData.sgstRate) : null,
        igstRate: formData.igstRate ? parseFloat(formData.igstRate) : null,
        priority: parseInt(formData.priority, 10) || 10,
        isActive: formData.isActive,
      };

      if (editingTax) {
        await apiRequest(`/taxes/${editingTax.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/taxes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      fetchTaxes();
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Error'}`);
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
              {isAdmin ? 'Tax Management' : 'Read-Only Catalog'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Percent className="w-7 h-7 text-indigo-600" />
            Tax Configuration & GST Compliance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Configure state and national tax schedules, CGST / SGST intra-state splits, and IGST inter-state assessments.'
              : 'Browse active system tax schedules and GST rates applied to customer quotations and invoices.'}
          </p>
        </div>

        {isAdmin && (
          <Button variant="primary" onClick={handleOpenAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Tax Rule
          </Button>
        )}
      </div>

      {/* Info card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Active tax rules are automatically evaluated during subscription billing cycles, quotation estimates, and invoice finalization. For Indian GST compliance, intra-state transactions decompose into 50% CGST and 50% SGST.
        </p>
      </div>

      {/* Tax Rules Table */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading tax rules...</p>
          </div>
        ) : taxes.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Percent className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No tax rules configured</p>
            <p className="text-xs text-slate-400 mt-1">Click above to add a standard GST 18% rule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tax Rule</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Tax Type</th>
                  <th className="px-4 py-3 text-right">Combined Rate</th>
                  <th className="px-4 py-3 text-center">CGST / SGST</th>
                  <th className="px-4 py-3 text-center">IGST</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{t.name}</span>
                      {t.isGst && (
                        <span className="block text-[10px] text-indigo-600 font-medium">
                          GST Compliant
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 font-semibold">{t.code}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {t.taxType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                      {Number(t.rate)}%
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">
                      {t.cgstRate && t.sgstRate ? `${t.cgstRate}% + ${t.sgstRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">
                      {t.igstRate ? `${t.igstRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-500">{t.priority}</td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <button
                          onClick={() => handleToggleActive(t)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Disabled'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Disabled'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(t)}
                          className="flex items-center gap-1.5 ml-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Tax Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTax ? 'Edit Tax Rule' : 'Create New Tax Rule'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Rule Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Standard GST 18%"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="System Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. GST_18"
              required
            />

            <Select
              label="Tax Type *"
              value={formData.taxType}
              onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
              options={[
                { value: 'GST', label: 'GST (Goods & Services Tax)' },
                { value: 'SALES_TAX', label: 'Standard Sales Tax' },
                { value: 'VAT', label: 'Value Added Tax (VAT)' },
                { value: 'WITHHOLDING', label: 'Withholding Tax' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Combined Rate (%) *"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              required
            />

            <Input
              label="Evaluation Priority"
              type="number"
              min="1"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isGst"
              checked={formData.isGst}
              onChange={(e) => setFormData({ ...formData, isGst: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isGst" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Indian GST breakdown (CGST + SGST / IGST)
            </label>
          </div>

          {formData.isGst && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                GST Component Breakdown
              </span>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="CGST Rate (%)"
                  type="number"
                  step="0.01"
                  value={formData.cgstRate}
                  onChange={(e) => setFormData({ ...formData, cgstRate: e.target.value })}
                />
                <Input
                  label="SGST Rate (%)"
                  type="number"
                  step="0.01"
                  value={formData.sgstRate}
                  onChange={(e) => setFormData({ ...formData, sgstRate: e.target.value })}
                />
                <Input
                  label="IGST Rate (%)"
                  type="number"
                  step="0.01"
                  value={formData.igstRate}
                  onChange={(e) => setFormData({ ...formData, igstRate: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Rule is Active and Applied to New Calculations
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingTax ? 'Update Tax Rule' : 'Save Tax Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
