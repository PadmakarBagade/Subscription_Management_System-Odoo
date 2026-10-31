import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Calendar,
  Layers,
  Loader2,
  Check,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/alerts?unreviewedOnly=${unreviewedOnly}`);
      if (res.success && Array.isArray(res.data)) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [unreviewedOnly]);

  const handleReviewAlert = async (id: string) => {
    try {
      await apiRequest(`/alerts/${id}/review`, { method: 'PATCH' });
      fetchAlerts();
    } catch (err: any) {
      alert(`Failed to review alert: ${err.message}`);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <Badge variant="danger">{severity}</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">MEDIUM</Badge>;
      case 'LOW':
      case 'INFO':
        return <Badge variant="info">INFO</Badge>;
      default:
        return <Badge variant="neutral">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-indigo-600" />
            Operational Alert Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time proactive notifications on overdue invoice breaches, failed payments, upcoming contract renewals, and churn risks.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setUnreviewedOnly(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              !unreviewedOnly ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setUnreviewedOnly(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              unreviewedOnly ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unreviewed Only
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <Card>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading operational alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
            <p className="text-sm font-semibold text-slate-700">All Systems Normal</p>
            <p className="text-xs text-slate-400 mt-1">
              No outstanding alerts or delinquent accounts require review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  !alert.isReviewed ? 'bg-indigo-50/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? (
                      <AlertOctagon className="w-5 h-5 text-red-500" />
                    ) : alert.severity === 'MEDIUM' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Info className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                      {getSeverityBadge(alert.severity)}
                      {alert.isReviewed && (
                        <span className="text-[10px] text-slate-400 font-medium">Reviewed</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      {alert.entityType && (
                        <span>
                          Target: {alert.entityType} ({alert.entityId?.slice(-8) || 'N/A'})
                        </span>
                      )}
                      {alert.reviewedBy && (
                        <span>Reviewed by: {alert.reviewedBy}</span>
                      )}
                    </div>
                  </div>
                </div>

                {!alert.isReviewed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewAlert(alert.id)}
                    className="flex-shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Mark Reviewed
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
