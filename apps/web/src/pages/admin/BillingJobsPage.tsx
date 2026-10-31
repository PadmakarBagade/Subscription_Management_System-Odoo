import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Eye,
  Loader2,
  Cpu,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const BillingJobsPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // Run Details Modal
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/billing/runs');
      if (res.success && Array.isArray(res.data)) {
        setRuns(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch billing runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleTriggerRun = async () => {
    if (!window.confirm('Execute an automated recurring billing cycle now across all active subscriptions?')) return;
    setTriggering(true);
    try {
      const res = await apiRequest('/billing/trigger', { method: 'POST' });
      alert(res.message || 'Billing cycle executed successfully!');
      fetchRuns();
    } catch (err: any) {
      alert(`Billing cycle failed: ${err.message || 'Error'}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleViewDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await apiRequest(`/billing/runs/${id}`);
      if (res.success) {
        setSelectedRun(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-7 h-7 text-indigo-600" />
            Automated Recurring Billing Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            CRON-scheduled & manual execution logs with calendar-aware date arithmetic, zero-drift leap year pinning, and strict idempotency guarantees.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleTriggerRun}
          disabled={triggering}
          className="flex items-center gap-2 shadow-sm"
        >
          {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Execute Billing Run Now
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>
            <strong>Background Cron Schedule:</strong> Evaluates midnight UTC every night (`0 0 * * *`). Subscriptions with `nextBillingDate &lt;= NOW()` generate invoices automatically.
          </span>
        </div>
        <span className="font-mono text-[11px] bg-white px-2.5 py-1 rounded border border-indigo-200 font-semibold">
          Idempotency: (subscriptionId, billingPeriodStart)
        </span>
      </div>

      {/* Billing Runs Table */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading billing execution logs...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RotateCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No billing runs recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Trigger a manual billing run above or wait for the midnight scheduler to run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Run Number</th>
                  <th className="px-4 py-3">Triggered At</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 text-center">Evaluated</th>
                  <th className="px-4 py-3 text-center">Invoices Created</th>
                  <th className="px-4 py-3 text-center">Skipped</th>
                  <th className="px-4 py-3 text-center">Failures</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run) => {
                  const durationMs = run.endTime
                    ? new Date(run.endTime).getTime() - new Date(run.startTime).getTime()
                    : 0;

                  return (
                    <tr key={run.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {run.runNumber}
                        <span className="block text-[10px] text-slate-400 font-sans font-normal">
                          {run.executedBy}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(run.startTime).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {durationMs > 0 ? `${(durationMs / 1000).toFixed(2)}s` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800">
                        {run.subscriptionsProcessed}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">
                        {run.invoicesCreated}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {run.subscriptionsSkipped}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {run.failuresCount > 0 ? (
                          <span className="text-red-600 font-bold">{run.failuresCount}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={run.status === 'COMPLETED' ? 'success' : 'danger'}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(run.id)}
                          className="flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Items
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Run Items Detail Modal */}
      <Modal
        isOpen={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        title={`Billing Run Inspection: ${selectedRun?.runNumber || ''}`}
        maxWidth="max-w-4xl"
      >
        {selectedRun && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Triggered By</span>
                <span className="font-bold text-slate-800">{selectedRun.executedBy}</span>
                <span className="block text-[11px] text-slate-400">
                  {new Date(selectedRun.startTime).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Subscriptions Processed</span>
                <span className="font-bold text-slate-800 text-base">
                  {selectedRun.subscriptionsProcessed}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Invoices Created</span>
                <span className="font-bold text-emerald-600 text-base">
                  {selectedRun.invoicesCreated}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <div className="mt-1">
                  <Badge variant={selectedRun.status === 'COMPLETED' ? 'success' : 'danger'}>
                    {selectedRun.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Itemized Subscriptions evaluated */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Evaluated Subscriptions & Invoicing Actions
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Subscription #</th>
                      <th className="px-3 py-2">Customer / Plan</th>
                      <th className="px-3 py-2">Billing Period</th>
                      <th className="px-3 py-2">Action / Status</th>
                      <th className="px-3 py-2">Generated Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRun.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                          {item.subscription?.subscriptionNumber || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-800">
                            {item.subscription?.customer?.companyName ||
                              item.subscription?.customer?.user?.name ||
                              'Customer'}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {item.subscription?.plan?.name} ({item.subscription?.billingFrequency})
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {new Date(item.periodStart).toLocaleDateString()} &rarr;{' '}
                          {new Date(item.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              item.status === 'SUCCESS'
                                ? 'success'
                                : item.status === 'SKIPPED'
                                ? 'neutral'
                                : 'danger'
                            }
                          >
                            {item.status}
                          </Badge>
                          {item.reason && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {item.reason}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {item.invoice ? (
                            <div>
                              <span className="font-bold text-indigo-600">
                                {item.invoice.invoiceNumber}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                ₹{Number(item.invoice.totalAmount).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setSelectedRun(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
