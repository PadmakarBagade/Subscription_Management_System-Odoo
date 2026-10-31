import React, { useState } from 'react';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';

export const PortalProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const profile = user?.customerProfile || {};

  const [name, setName] = useState(user?.name || '');
  const [companyName, setCompanyName] = useState(profile.companyName || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [billingAddress, setBillingAddress] = useState(profile.billingAddress || '');
  const [taxId, setTaxId] = useState(profile.taxId || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await apiRequest(`/customers/${profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          companyName,
          phone,
          billingAddress,
          taxId,
        }),
      });

      setSuccess(true);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Account Profile & Billing Details
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your organization name, tax identification (GSTIN), and invoice billing address.
        </p>
      </div>

      <Card>
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Profile and billing information updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email Address (Login Identity)"
            type="email"
            disabled
            value={user?.email || ''}
            helperText="To change your primary email, please contact customer support."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Legal Entity"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Innovations Pvt Ltd"
            />
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <Input
            label="GSTIN / Tax Identification"
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="e.g. 29ABCDE1234F1Z5"
            helperText="Printed on all official tax invoices for GST input credit."
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Billing Address
            </label>
            <textarea
              rows={3}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Full registered office address..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" loading={loading}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
