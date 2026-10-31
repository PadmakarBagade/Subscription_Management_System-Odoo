import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Eye,
  Filter,
  User,
  Calendar,
  Layers,
  Loader2,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = '/audit-logs?limit=50';
      if (entityFilter) url += `&entityType=${entityFilter}`;

      const res = await apiRequest(url);
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED')) return <Badge variant="success">{action}</Badge>;
    if (action.includes('UPDATED') || action.includes('MODIFIED'))
      return <Badge variant="info">{action}</Badge>;
    if (action.includes('CANCELLED') || action.includes('DELETED') || action.includes('PAUSED'))
      return <Badge variant="danger">{action}</Badge>;
    return <Badge variant="neutral">{action}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-600" />
            Immutable System Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic event ledger capturing all mutations, actor user IDs, lifecycle transitions, and state diffs.
          </p>
        </div>

        {/* Entity filter */}
        <div className="w-full sm:w-56">
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Entity Types' },
              { value: 'Invoice', label: 'Invoices' },
              { value: 'Subscription', label: 'Subscriptions' },
              { value: 'Payment', label: 'Payments' },
              { value: 'CustomerProfile', label: 'Customers' },
              { value: 'TaxRule', label: 'Tax Rules' },
              { value: 'DiscountRule', label: 'Discount Rules' },
            ]}
          />
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading immutable audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No audit logs recorded</p>
            <p className="text-xs text-slate-400 mt-1">Actions performed across the system will be indexed here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 block">{log.userEmail || 'System'}</span>
                      {log.userId && (
                        <span className="text-[10px] text-slate-400 font-mono">ID: {log.userId.slice(-8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{log.entityType}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {log.entityId ? log.entityId.slice(-10) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Diff
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect State Diff Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Entry: ${selectedLog?.action || ''}`}
        maxWidth="max-w-4xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Actor</span>
                <span className="font-bold text-slate-800">{selectedLog.userEmail || 'System'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Action</span>
                <span className="font-bold text-indigo-600">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Target Entity</span>
                <span className="font-bold text-slate-800">
                  {selectedLog.entityType} ({selectedLog.entityId?.slice(-8)})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Recorded At</span>
                <span className="text-slate-700 font-mono text-[11px]">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Before and After JSON Diffs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Before Mutation State
                </span>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] h-72 overflow-y-auto">
                  {selectedLog.beforeState ? (
                    <pre>{JSON.stringify(selectedLog.beforeState, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500 italic">None (Entity created)</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  After Mutation State
                </span>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] h-72 overflow-y-auto">
                  {selectedLog.afterState ? (
                    <pre>{JSON.stringify(selectedLog.afterState, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500 italic">None (Entity deleted)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
