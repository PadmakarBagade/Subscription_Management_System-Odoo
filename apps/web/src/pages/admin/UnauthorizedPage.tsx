import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 mb-3">
          HTTP 403 Forbidden
        </span>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Restricted Admin Area</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          You do not have administrative privileges to view or manage this section. Staff accounts are limited to operational tasks.
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Staff Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
