import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Pause,
  Play,
  RefreshCw,
  XCircle,
  Search,
  Loader2,
  Eye,
  CheckCircle2,
  Send,
  Calendar,
  CreditCard,
  Building,
  User,
  Package,
} from 'lucide-react';
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

  // Transition & Action state
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  // Detail Modal state
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    subscription: any | null;
    loading: boolean;
  }>({
    isOpen: false,
    subscription: null,
    loading: false,
  });

  // Action / Confirmation modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: string | null;
    toStatus: string | null;
    subscription: any | null;
    note: string;
    loading: boolean;
  }>({
    isOpen: false,
    action: null,
    toStatus: null,
    subscription: null,
    note: '',
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

  const handleOpenDetail = async (sub: any) => {
    setDetailModal({ isOpen: true, subscription: sub, loading: true });
    try {
      const res = await apiRequest(`/subscriptions/${sub.id}`);
      if (res.success && res.data) {
        setDetailModal({ isOpen: true, subscription: res.data, loading: false });
      }
    } catch (err) {
      console.error(err);
      setDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleQuickTransition = async (id: string, toStatus: string) => {
    setTransitioningId(id);
    try {
      const res = await apiRequest(`/subscriptions/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus }),
      });
      if (res.success) {
        fetchSubscriptions();
      }
    } catch (err: any) {
      alert(`Lifecycle transition failed: ${err.message || 'Error'}`);
    } finally {
      setTransitioningId(null);
    }
  };

  const handleExecuteModalAction = async () => {
    const { action, toStatus, subscription, note } = actionModal;
    if (!subscription) return;

    setActionModal((prev) => ({ ...prev, loading: true }));

    try {
      if (toStatus) {
        // Transition endpoint
        await apiRequest(`/subscriptions/${subscription.id}/transition`, {
          method: 'POST',
          body: JSON.stringify({ toStatus, note }),
        });
      } else if (action) {
        // Legacy action endpoint (pause, resume, renew, cancel)
        await apiRequest(`/subscriptions/${subscription.id}/${action}`, {
          method: 'POST',
          body: JSON.stringify({ reason: note }),
        });
      }

      setActionModal({
        isOpen: false,
        action: null,
        toStatus: null,
        subscription: null,
        note: '',
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCw className="w-6 h-6 text-indigo-600" />
            Subscription Lifecycle Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end contract progression: Draft → Quotation → Confirmed → Active → Closed (with Pause/Renew).
          </p>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['', 'DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st || 'All Contracts'}
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

      {/* Main Subscriptions Table */}
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
                  <th className="py-3 px-4">Plan & Terms</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4 text-right">Recurring (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(sub)}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline font-mono"
                        title="View contract details"
                      >
                        {sub.subscriptionNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div>{sub.customer?.companyName || sub.customer?.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{sub.customer?.user?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{sub.plan?.name}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="uppercase font-mono">{sub.billingFrequency}</span>
                        <span>•</span>
                        <span>{sub.paymentTermType || 'IMMEDIATE'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{new Date(sub.startDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : (
                        <span className="text-slate-400 italic">Open-Ended</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">
                      {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{Number(sub.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* Step-by-step lifecycle transition buttons */}
                      {sub.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={transitioningId === sub.id}
                          onClick={() => handleQuickTransition(sub.id, 'QUOTATION')}
                          icon={<Send className="w-3.5 h-3.5" />}
                        >
                          Send Quote
                        </Button>
                      )}

                      {sub.status === 'QUOTATION' && (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={transitioningId === sub.id}
                          onClick={() => handleQuickTransition(sub.id, 'CONFIRMED')}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Confirm
                        </Button>
                      )}

                      {sub.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={transitioningId === sub.id}
                          onClick={() => handleQuickTransition(sub.id, 'ACTIVE')}
                          icon={<Play className="w-3.5 h-3.5" />}
                        >
                          Activate
                        </Button>
                      )}

                      {sub.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: null,
                                toStatus: 'PAUSED',
                                subscription: sub,
                                note: '',
                                loading: false,
                              })
                            }
                            className="p-1 rounded text-amber-600 hover:bg-amber-50"
                            title="Pause Subscription"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: 'renew',
                                toStatus: null,
                                subscription: sub,
                                note: '',
                                loading: false,
                              })
                            }
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50"
                            title="Renew Cycle"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: null,
                                toStatus: 'CLOSED',
                                subscription: sub,
                                note: '',
                                loading: false,
                              })
                            }
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="Close Subscription"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {sub.status === 'PAUSED' && (
                        <>
                          <button
                            onClick={() => handleQuickTransition(sub.id, 'ACTIVE')}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                            title="Resume Subscription"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                action: null,
                                toStatus: 'CLOSED',
                                subscription: sub,
                                note: '',
                                loading: false,
                              })
                            }
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="Close Subscription"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Detail inspection modal trigger */}
                      <button
                        onClick={() => handleOpenDetail(sub)}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100"
                        title="View Full Contract & Lines"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Full Subscription Details Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, subscription: null, loading: false })}
        title={`Subscription Details: ${detailModal.subscription?.subscriptionNumber || ''}`}
        maxWidth="xl"
      >
        {detailModal.loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : detailModal.subscription ? (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <Badge status={detailModal.subscription.status} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan</span>
                <span className="font-bold text-slate-900">{detailModal.subscription.plan?.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billing Cycle</span>
                <span className="font-semibold text-slate-800">{detailModal.subscription.billingFrequency}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Terms</span>
                <span className="font-semibold text-slate-800">{detailModal.subscription.paymentTermType || 'IMMEDIATE'}</span>
              </div>
            </div>

            {/* Dates & Customer info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Customer Account
                </div>
                <div>Name: <strong>{detailModal.subscription.customer?.user?.name}</strong></div>
                <div>Company: {detailModal.subscription.customer?.companyName || '—'}</div>
                <div>Email: {detailModal.subscription.customer?.user?.email}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Timeline & Renewal
                </div>
                <div>Start Date: {new Date(detailModal.subscription.startDate).toLocaleDateString()}</div>
                <div>Expiry Date: {detailModal.subscription.expiryDate ? new Date(detailModal.subscription.expiryDate).toLocaleDateString() : 'Open-Ended'}</div>
                <div>Next Billing: {detailModal.subscription.nextBillingDate ? new Date(detailModal.subscription.nextBillingDate).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" /> Contract Line Items
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Variant</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Tax (18%)</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailModal.subscription.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{line.product?.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {line.variant ? `${line.variant.name}: ${line.variant.value} (+₹${line.variant.priceAdjustment})` : 'Standard'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{line.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(line.unitPrice).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(line.taxAmount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(line.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total summary */}
              <div className="mt-3 flex justify-end">
                <div className="w-64 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{Number(detailModal.subscription.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span className="font-mono">₹{Number(detailModal.subscription.taxAmount).toFixed(2)}</span>
                  </div>
                  {Number(detailModal.subscription.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">-₹{Number(detailModal.subscription.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                    <span>Recurring Total:</span>
                    <span className="font-mono text-indigo-600">₹{Number(detailModal.subscription.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            {detailModal.subscription.invoices && detailModal.subscription.invoices.length > 0 && (
              <div>
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Issued Invoices ({detailModal.subscription.invoices.length})
                </p>
                <div className="space-y-1.5">
                  {detailModal.subscription.invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-mono font-semibold text-slate-900">{inv.invoiceNumber}</span>
                        <span className="text-slate-400 ml-2 text-[11px]">{new Date(inv.invoiceDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 font-mono">₹{Number(inv.totalAmount).toFixed(2)}</span>
                        <Badge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Confirmation & Lifecycle Action Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() =>
          setActionModal({
            isOpen: false,
            action: null,
            toStatus: null,
            subscription: null,
            note: '',
            loading: false,
          })
        }
        title={`Confirm ${actionModal.toStatus || actionModal.action?.toUpperCase()}`}
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            Are you sure you want to transition subscription{' '}
            <strong>{actionModal.subscription?.subscriptionNumber}</strong> to{' '}
            <strong>{actionModal.toStatus || actionModal.action?.toUpperCase()}</strong>?
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Audit Note / Reason
            </label>
            <textarea
              rows={2}
              value={actionModal.note}
              onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
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
                  toStatus: null,
                  subscription: null,
                  note: '',
                  loading: false,
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.toStatus === 'CLOSED' ? 'danger' : 'primary'}
              size="sm"
              loading={actionModal.loading}
              onClick={handleExecuteModalAction}
            >
              Confirm Transition
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
