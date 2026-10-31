import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Tag, Loader2, Check, Settings, Sparkles } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

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

  // Manage Variants Modal
  const [variantModalProduct, setVariantModalProduct] = useState<any | null>(null);
  const [newVariantName, setNewVariantName] = useState('Brand');
  const [newVariantValue, setNewVariantValue] = useState('Odoo');
  const [newVariantAdjustment, setNewVariantAdjustment] = useState('560');
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantError, setVariantError] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await apiRequest('/products?includeInactive=true');
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
        // Refresh active product in variant modal if open
        if (variantModalProduct) {
          const updated = res.data.find((p: any) => p.id === variantModalProduct.id);
          if (updated) setVariantModalProduct(updated);
        }
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
    setVariants([...variants, { name: 'Brand', value: 'Odoo', priceAdjustment: '560' }]);
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

  const handleAddProductVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantModalProduct) return;
    setVariantSaving(true);
    setVariantError('');

    try {
      await apiRequest(`/products/${variantModalProduct.id}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          name: newVariantName.trim(),
          value: newVariantValue.trim(),
          priceAdjustment: parseFloat(newVariantAdjustment) || 0,
        }),
      });

      setNewVariantName('Brand');
      setNewVariantValue('');
      setNewVariantAdjustment('0');
      await fetchProducts();
    } catch (err: any) {
      setVariantError(err.message || 'Failed to add variant');
    } finally {
      setVariantSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!variantModalProduct) return;
    try {
      await apiRequest(`/products/${variantModalProduct.id}/variants/${variantId}`, {
        method: 'DELETE',
      });
      await fetchProducts();
    } catch (err: any) {
      alert(`Failed to delete variant: ${err.message || 'Error'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isAdmin
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {isAdmin ? 'Catalog Management' : 'Read-Only Catalog'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Products & Product Variants
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Manage software catalog offerings and configure tiered variant adjustments (e.g. Odoo brand +₹560).'
              : 'Browse active catalog items and variant price additions for customer quotations.'}
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Product
          </Button>
        )}
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
                  <th className="py-3 px-4 text-right">Sales Price</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Cost Price</th>}
                  <th className="py-3 px-4">Available Variants</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
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
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right text-slate-500 text-xs font-mono">
                        {p.costPrice !== undefined
                          ? `₹${Number(p.costPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    )}
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
                                {Number(v.priceAdjustment) >= 0
                                  ? `+₹${v.priceAdjustment}`
                                  : `-₹${Math.abs(v.priceAdjustment)}`}
                              </strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVariantModalProduct(p)}
                          icon={<Tag className="w-3.5 h-3.5" />}
                        >
                          Variants ({p.variants?.length || 0})
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
              required
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>

          {/* Variants Configuration Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Initial Product Variants (e.g. Brand: Odoo +₹560)
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAddVariantRow}
                icon={<Plus className="w-3 h-3" />}
              >
                Add Variant
              </Button>
            </div>

            {variants.map((v, index) => (
              <div key={index} className="flex gap-2 items-center mb-2">
                <Input
                  placeholder="Variant Name (e.g. Brand)"
                  value={v.name}
                  onChange={(e) => {
                    const copy = [...variants];
                    copy[index].name = e.target.value;
                    setVariants(copy);
                  }}
                />
                <Input
                  placeholder="Value (e.g. Odoo)"
                  value={v.value}
                  onChange={(e) => {
                    const copy = [...variants];
                    copy[index].value = e.target.value;
                    setVariants(copy);
                  }}
                />
                <Input
                  placeholder="Price Adj (e.g. 560)"
                  type="number"
                  value={v.priceAdjustment}
                  onChange={(e) => {
                    const copy = [...variants];
                    copy[index].priceAdjustment = e.target.value;
                    setVariants(copy);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVariantRow(index)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dedicated Variant Management Modal */}
      <Modal
        isOpen={Boolean(variantModalProduct)}
        onClose={() => setVariantModalProduct(null)}
        title={`Manage Variants: ${variantModalProduct?.name || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="text-slate-500">
            Base Sales Price: <strong className="text-slate-900 font-mono">₹{Number(variantModalProduct?.salesPrice || 0).toFixed(2)}</strong>
          </p>

          {/* Current Variants List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 font-bold text-slate-600 uppercase text-[11px] border-b border-slate-200">
              Active Variants ({variantModalProduct?.variants?.length || 0})
            </div>
            {variantModalProduct?.variants?.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                No variants configured for this product.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {variantModalProduct?.variants?.map((v: any) => (
                  <div key={v.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{v.name}: {v.value}</span>
                      <span className="ml-3 font-mono font-bold text-indigo-600">
                        {Number(v.priceAdjustment) >= 0 ? `+₹${v.priceAdjustment}` : `-₹${Math.abs(v.priceAdjustment)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVariant(v.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                      title="Delete Variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Variant Form */}
          <form onSubmit={handleAddProductVariant} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Add Product Variant (e.g. Brand: Odoo +₹560)
            </p>

            {variantError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {variantError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Variant Name"
                placeholder="Brand, Tier, Edition"
                required
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
              />
              <Input
                label="Variant Value"
                placeholder="Odoo, Enterprise"
                required
                value={newVariantValue}
                onChange={(e) => setNewVariantValue(e.target.value)}
              />
              <Input
                label="Price Adj (₹)"
                type="number"
                step="0.01"
                required
                value={newVariantAdjustment}
                onChange={(e) => setNewVariantAdjustment(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="primary" size="sm" type="submit" loading={variantSaving} icon={<Plus className="w-3.5 h-3.5" />}>
                Save Variant
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
