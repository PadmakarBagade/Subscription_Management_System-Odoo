import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type StatusVariant =
  | 'ACTIVE'
  | 'CONFIRMED'
  | 'PAID'
  | 'PAUSED'
  | 'OVERDUE'
  | 'CLOSED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'PARTIALLY_PAID'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'DEFAULT'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral';

interface BadgeProps {
  status?: string;
  variant?: StatusVariant | string;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, className, children }) => {
  const content = children || status || 'DEFAULT';
  const rawKey = (variant || (typeof content === 'string' ? content : '') || 'DEFAULT').toUpperCase();

  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
    DRAFT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
    DANGER: 'bg-rose-50 text-rose-700 border-rose-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    INFO: 'bg-blue-50 text-blue-700 border-blue-200',
    NEUTRAL: 'bg-slate-100 text-slate-700 border-slate-200',
    DEFAULT: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const currentStyle = styles[rawKey] || styles.DEFAULT;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          currentStyle,
          className
        )
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {typeof content === 'string' ? content.replace(/_/g, ' ') : content}
    </span>
  );
};
