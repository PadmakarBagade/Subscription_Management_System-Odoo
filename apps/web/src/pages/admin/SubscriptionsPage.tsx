import React, { useState, useEffect } from 'react';
import { RotateCw, Pause, Play, RefreshCw, XCircle, Search, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Lifecycle action modal state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: 'pause' | 'resume' | 'renew' | 'cancel' | null;
    subscription: any | null;
    reason: string;
    loading: boolean;
  }>({
    isOpen: false,
    action: null,
    subscription: null,
    reason: '',
    loading: false,
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      let url = '/subscriptions?limit=50';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiRequest(url);
      if (res.success && Array.isArray(res.data)) {
        setSubscriptions(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, search]);

  const handleExecuteAction = async () => {
    const { action, subscription, reason } = actionModal;
    if (!action || !subscription) return;

    setActionModal((prev) => ({ ...prev, loading: true }));

    try {
      await apiRequest(`/subscriptions/${subscription.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      setActionModal({
        isOpen: false,
        action: null,
        subscription: null,
        reason: '',
        loading: false,
      });

      fetchSubscriptions();
    } catch (err: any) {
      alert(`Action failed: ${err.message || 'Error'}`);
      setActionModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Subscription Lifecycle Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track active customer contracts, billing frequencies, renewal schedules, and lifecycle states.
          </p>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['', 'ACTIVE', 'CONFIRMED', 'PAUSED', 'DRAFT', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st || 'All States'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subscription #, customer, plan..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <RotateCw className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No subscriptions match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan & Frequency</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Next Billing Date</th>
                  <th className="py-3 px-4 text-right">Recurring Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {sub.customer?.companyName || sub.customer?.user?.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{sub.plan?.name}</span>
                      <span className="block text-[11px] text-slate-400 uppercase font-mono">
                        {sub.billingFrequency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{new Date(sub.startDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">
                      {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{Number(sub.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {sub.status === 'ACTIVE' && (
                        <button
                          onClick={() =>
                            setActionModal({
                              isOpen: true,
                              action: 'pause',
                              subscription: sub,
                              reason: '',
                              loading: false,
                            })
                          }
                          className="p-1 rounded text-amber-600 hover:bg-amber-50"
                          title="Pause Subscription"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {sub.status === 'PAUSED' && (
                        <button
                          onClick={() =>
                            setActionModal({
                              isOpen: true,
                              action: 'resume',
                              subscription: sub,
                              reason: '',
                              loading: false,
                            })
                          }
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                          title="Resume Subscription"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {sub.status === 'ACTIVE' && (
                        <button
                          onClick={() =>
                            setActionModal({
                              isOpen: true,
                              action: 'renew',
                              subscription: sub,
                              reason: '',
                              loading: false,
                            })
                          }
                          className="p-1 rounded text-indigo-600 hover:bg-indigo-50"
                          title="Renew Cycle"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {sub.status !== 'CLOSED' && (
                        <button
                          onClick={() =>
                            setActionModal({
                              isOpen: true,
                              action: 'cancel',
                              subscription: sub,
                              reason: '',
                              loading: false,
                            })
                          }
                          className="p-1 rounded text-rose-600 hover:bg-rose-50"
                          title="Close / Cancel Subscription"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() =>
          setActionModal({
            isOpen: false,
            action: null,
            subscription: null,
            reason: '',
            loading: false,
          })
        }
        title={`Confirm ${actionModal.action?.toUpperCase()}`}
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            Are you sure you want to {actionModal.action} subscription{' '}
            <strong>{actionModal.subscription?.subscriptionNumber}</strong> for{' '}
            {actionModal.subscription?.customer?.companyName || actionModal.subscription?.customer?.user?.name}?
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Audit Note / Reason
            </label>
            <textarea
              rows={2}
              value={actionModal.reason}
              onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
              placeholder="Enter reason for audit logs..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActionModal({
                  isOpen: false,
                  action: null,
                  subscription: null,
                  reason: '',
                  loading: false,
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.action === 'cancel' ? 'danger' : 'primary'}
              size="sm"
              loading={actionModal.loading}
              onClick={handleExecuteAction}
            >
              Execute {actionModal.action?.toUpperCase()}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
