import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Building2, Mail, Phone, Loader2, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    billingAddress: '',
    taxId: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected customer for detail view
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = `/customers?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiRequest(url);
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(modalForm),
      });

      if (res.success) {
        setIsModalOpen(false);
        setModalForm({
          name: '',
          email: '',
          companyName: '',
          phone: '',
          billingAddress: '',
          taxId: '',
        });
        fetchCustomers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage subscriber accounts, tax identification numbers, and contact profiles.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by customer name, company, email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No customers matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer / Contact</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">GSTIN / Tax ID</th>
                  <th className="py-3 px-4 text-center">Subscriptions</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{c.user?.name}</p>
                      <p className="text-[11px] text-slate-400">{c.user?.email}</p>
                    </td>
                    <td className="py-3 px-4 font-medium">{c.companyName || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{c.taxId || '—'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {c._count?.subscriptions ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={c.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        ₹{Number(c.outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCustomer(c)}
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Customer Profile"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <Input
            label="Contact Full Name"
            type="text"
            required
            value={modalForm.name}
            onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
            placeholder="e.g. Michael Scott"
          />

          <Input
            label="Email Address (Login Username)"
            type="email"
            required
            value={modalForm.email}
            onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
            placeholder="michael@dundermifflin.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              type="text"
              value={modalForm.companyName}
              onChange={(e) => setModalForm({ ...modalForm, companyName: e.target.value })}
              placeholder="Dunder Mifflin Paper Co."
            />
            <Input
              label="Phone Number"
              type="tel"
              value={modalForm.phone}
              onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
              placeholder="+91 98765 00000"
            />
          </div>

          <Input
            label="GSTIN / Tax ID"
            type="text"
            value={modalForm.taxId}
            onChange={(e) => setModalForm({ ...modalForm, taxId: e.target.value })}
            placeholder="e.g. 29ABCDE1234F1Z5"
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Registered Billing Address
            </label>
            <textarea
              rows={3}
              value={modalForm.billingAddress}
              onChange={(e) => setModalForm({ ...modalForm, billingAddress: e.target.value })}
              placeholder="Full physical address for invoice dispatch..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomer(null)}
          title={`Customer: ${selectedCustomer.companyName || selectedCustomer.user?.name}`}
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Primary Contact</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.user?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.user?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Phone</span>
                <span>{selectedCustomer.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">GSTIN / Tax ID</span>
                <span className="font-mono">{selectedCustomer.taxId || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase mb-1">Billing Address</span>
              <p className="p-3 bg-white border border-slate-200 rounded-lg">
                {selectedCustomer.billingAddress || 'No billing address specified'}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
