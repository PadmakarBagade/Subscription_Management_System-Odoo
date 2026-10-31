import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Layers,
  LayoutDashboard,
  RotateCw,
  Receipt,
  CreditCard,
  User,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { name: 'My Subscriptions', href: '/portal/subscriptions', icon: RotateCw },
    { name: 'Invoices & Receipts', href: '/portal/invoices', icon: Receipt },
    { name: 'Payment History', href: '/portal/payments', icon: CreditCard },
    { name: 'Account Profile', href: '/portal/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Customer Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight">Brightloop</span>
                  <span className="text-xs text-indigo-600 font-semibold ml-1 px-1.5 py-0.5 bg-indigo-50 rounded">
                    Customer Portal
                  </span>
                </div>
              </Link>

              {/* Navigation Tabs (Desktop) */}
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
                {links.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.customerProfile?.companyName || user?.email}</p>
              </div>

              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-slate-100 bg-white px-2 py-1 flex items-center justify-around overflow-x-auto text-xs">
          {links.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`p-2 flex flex-col items-center gap-1 rounded-md ${
                  isActive ? 'text-indigo-600 font-semibold' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{item.name.replace('My ', '')}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
