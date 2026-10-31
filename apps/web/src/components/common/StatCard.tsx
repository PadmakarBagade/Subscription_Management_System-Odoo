import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon: React.ReactNode | React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  description,
  icon: IconOrElement,
  trend,
  color = 'indigo',
}) => {
  const iconColors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-700',
  };

  const renderIcon = () => {
    if (!IconOrElement) return null;
    if (React.isValidElement(IconOrElement)) {
      return IconOrElement;
    }
    const IconComp = IconOrElement as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-5 h-5" />;
  };

  return (
    <Card className="hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={clsx('p-2.5 rounded-lg flex items-center justify-center', iconColors[color])}>
          {renderIcon()}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
        {(subtitle || description) && (
          <p className="mt-1 text-xs text-slate-500">{subtitle || description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span
              className={clsx(
                'font-medium mr-1',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            <span className="text-slate-400">vs last cycle</span>
          </div>
        )}
      </div>
    </Card>
  );
};
