import React, { useState, useEffect } from 'react';
import { RotateCw, Pause, Play, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';

export const PortalSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: 'PAUSE' | 'RESUME' | 'CANCEL' | null;
    subscription: any | null;
    reason: string;
    loading: boolean;
    error: string;
  }>({
    isOpen: false,
    action: null,
    subscription: null,
    reason: '',
    loading: false,
    error: '',
  });

  const fetchSubscriptions = async () => {
    try {
      const res = await apiRequest('/subscriptions');
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
  }, []);

  const handleAction = async () => {
    const { action, subscription, reason } = actionModal;
    if (!subscription || !action) return;

    setActionModal((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      let endpoint = '';
      if (action === 'PAUSE') endpoint = `/subscriptions/${subscription.id}/pause`;
      else if (action === 'RESUME') endpoint = `/subscriptions/${subscription.id}/resume`;
      else if (action === 'CANCEL') endpoint = `/subscriptions/${subscription.id}/cancel`;

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      setActionModal({
        isOpen: false,
        action: null,
        subscription: null,
        reason: '',
        loading: false,
        error: '',
      });

      fetchSubscriptions();
    } catch (err: any) {
      setActionModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Action failed',
      }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          My Subscriptions
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your active software subscriptions, billing dates, and plan management options.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="text-center py-12 text-slate-500">
          <RotateCw className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-800">No Subscriptions Found</h3>
          <p className="text-xs text-slate-500 mt-1">You have not subscribed to any software plans yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400">{sub.subscriptionNumber}</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{sub.plan?.name}</h3>
                  </div>
                  <Badge status={sub.status} />
                </div>

                {/* Line items */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Included Services
                  </p>
                  {sub.lines?.map((line: any) => (
                    <div key={line.id} className="flex justify-between text-xs text-slate-700">
                      <span>
                        {line.product?.name}
                        {line.variant ? ` (${line.variant.name}: ${line.variant.value})` : ''} × {line.quantity}
                      </span>
                      <span className="font-medium">₹{Number(line.totalAmount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Billing Cycle:</span>{' '}
                    <span className="font-semibold text-slate-800">{sub.billingFrequency}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Total Recurring:</span>{' '}
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{Number(sub.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {sub.nextBillingDate && (
                  <p className="mt-2 text-xs text-slate-500">
                    Next billing renewal:{' '}
                    <span className="font-semibold text-slate-800">
                      {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </span>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                {sub.status === 'ACTIVE' && sub.plan?.allowPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Pause className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setActionModal({
                        isOpen: true,
                        action: 'PAUSE',
                        subscription: sub,
                        reason: '',
                        loading: false,
                        error: '',
                      })
                    }
                  >
                    Pause
                  </Button>
                )}

                {sub.status === 'PAUSED' && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Play className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setActionModal({
                        isOpen: true,
                        action: 'RESUME',
                        subscription: sub,
                        reason: '',
                        loading: false,
                        error: '',
                      })
                    }
                  >
                    Resume
                  </Button>
                )}

                {sub.status !== 'CLOSED' && sub.plan?.allowEarlyClosure && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 ml-auto"
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setActionModal({
                        isOpen: true,
                        action: 'CANCEL',
                        subscription: sub,
                        reason: '',
                        loading: false,
                        error: '',
                      })
                    }
                  >
                    Cancel Plan
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() =>
          setActionModal({
            isOpen: false,
            action: null,
            subscription: null,
            reason: '',
            loading: false,
            error: '',
          })
        }
        title={`${actionModal.action} Subscription`}
      >
        <div className="space-y-4">
          {actionModal.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionModal.error}</span>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to {actionModal.action?.toLowerCase()} subscription{' '}
            <strong>{actionModal.subscription?.subscriptionNumber}</strong> ({actionModal.subscription?.plan?.name})?
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reason / Feedback (Optional)
            </label>
            <textarea
              rows={3}
              value={actionModal.reason}
              onChange={(e) =>
                setActionModal({ ...actionModal, reason: e.target.value })
              }
              placeholder="Let us know why you are changing your subscription..."
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
                  error: '',
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.action === 'CANCEL' ? 'danger' : 'primary'}
              size="sm"
              loading={actionModal.loading}
              onClick={handleAction}
            >
              Confirm {actionModal.action}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
