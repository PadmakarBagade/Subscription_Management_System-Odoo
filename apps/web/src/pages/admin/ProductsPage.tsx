import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Tag, Loader2, Check } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('SERVICE');
  const [salesPrice, setSalesPrice] = useState('2000');
  const [costPrice, setCostPrice] = useState('500');
  const [variants, setVariants] = useState<Array<{ name: string; value: string; priceAdjustment: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await apiRequest('/products?includeInactive=true');
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddVariantRow = () => {
    setVariants([...variants, { name: 'Connector', value: 'New Variant', priceAdjustment: '0' }]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          code: code.toUpperCase().trim(),
          type,
          salesPrice: parseFloat(salesPrice),
          costPrice: parseFloat(costPrice),
          variants: variants.map((v) => ({
            name: v.name,
            value: v.value,
            priceAdjustment: parseFloat(v.priceAdjustment) || 0,
            isActive: true,
          })),
        }),
      });

      setIsModalOpen(false);
      setName('');
      setCode('');
      setVariants([]);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Products & Product Variants
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage base catalog items and authoritatively configured variant price adjustments.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Product
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No products in catalog yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name & Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Base Sales Price</th>
                  <th className="py-3 px-4">Configured Variants (Price Adjustments)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <p>{p.name}</p>
                      <span className="font-mono text-[11px] text-slate-400">{p.code}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{Number(p.salesPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.variants?.length === 0 ? (
                        <span className="text-slate-400">No variants</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {p.variants.map((v: any) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px]"
                            >
                              <Tag className="w-3 h-3 text-indigo-400" />
                              <span>{v.name}: {v.value}</span>
                              <strong className="text-slate-900 ml-0.5">
                                {Number(v.priceAdjustment) >= 0 ? `+₹${v.priceAdjustment}` : `-₹${Math.abs(v.priceAdjustment)}`}
                              </strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Catalog Product"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Product Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brightloop Cloud Core ERP"
            />
            <Input
              label="Product Code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PROD_CORE_ERP"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Product Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="SERVICE">Service (SaaS)</option>
              <option value="DIGITAL">Digital</option>
              <option value="PHYSICAL">Physical</option>
            </Select>

            <Input
              label="Sales Price (₹)"
              type="number"
              step="0.01"
              required
              value={salesPrice}
              onChange={(e) => setSalesPrice(e.target.value)}
            />

            <Input
              label="Cost Price (₹)"
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>

          {/* Variants section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Product Variants & Adjustments
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariantRow}
                icon={<Plus className="w-3 h-3" />}
              >
                Add Variant Row
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No variants added. Base price will apply.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Category (e.g. Connector, Tier)"
                      value={v.name}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[i].name = e.target.value;
                        setVariants(copy);
                      }}
                      className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Odoo Brand, 24/7 SLA)"
                      value={v.value}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[i].value = e.target.value;
                        setVariants(copy);
                      }}
                      className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">Adjustment: ₹</span>
                      <input
                        type="number"
                        placeholder="560"
                        value={v.priceAdjustment}
                        onChange={(e) => {
                          const copy = [...variants];
                          copy[i].priceAdjustment = e.target.value;
                          setVariants(copy);
                        }}
                        className="w-20 px-2 py-1 text-xs border rounded bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariantRow(i)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
