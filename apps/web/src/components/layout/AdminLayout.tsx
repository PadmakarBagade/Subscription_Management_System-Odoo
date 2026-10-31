import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarCheck,
  FileText,
  CreditCard,
  RotateCw,
  Percent,
  Receipt,
  BarChart3,
  Calculator,
  History,
  Bell,
  Sparkles,
  LogOut,
  Menu,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AiAssistantDrawer } from '../ai/AiAssistantDrawer';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Products & Variants', href: '/admin/products', icon: Package },
    { name: 'Subscription Plans', href: '/admin/plans', icon: CalendarCheck },
    { name: 'Quotations', href: '/admin/quotations', icon: FileText },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: RotateCw },
    { name: 'Invoices', href: '/admin/invoices', icon: Receipt },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Billing Engine', href: '/admin/billing-jobs', icon: RotateCw },
    { name: 'Tax Rules', href: '/admin/taxes', icon: Percent },
    { name: 'Discount Rules', href: '/admin/discounts', icon: Percent },
    { name: 'Financial Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Billing Simulator', href: '/admin/simulator', icon: Calculator },
    { name: 'Audit Trail', href: '/admin/audit-logs', icon: History },
    { name: 'Alert Center', href: '/admin/alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">Brightloop</span>
            <span className="block text-[10px] text-slate-400 font-mono tracking-wider">
              {user?.role === 'ADMIN' ? 'ADMIN WORKSPACE' : 'STAFF PORTAL'}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/admin" className="hover:text-indigo-600">Admin</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-900 capitalize">
                {location.pathname.replace('/admin/', '').replace(/-/g, ' ') || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant Button */}
            <button
              onClick={() => setAiDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-indigo-200 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Revenue Assistant</span>
            </button>

            {/* Alert Center Link */}
            <Link
              to="/admin/alerts"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative"
              title="Alerts"
            >
              <Bell className="w-5 h-5" />
            </Link>

            {/* Profile chip */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </div>
  );
};
