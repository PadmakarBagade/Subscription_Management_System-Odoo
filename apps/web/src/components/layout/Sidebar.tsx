import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Sidebar Context ──────────────────────────────────────────────────────────
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// ── Sidebar Provider (wraps app to share collapse state) ─────────────────────
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', String(collapsed));
    } catch {}
  }, [collapsed]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

// ── Nav Item Type ─────────────────────────────────────────────────────────────
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

// ── Sidebar Component ─────────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const { collapsed, setCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();

  const isStaff = user?.role === 'STAFF';

  const adminNav: NavItem[] = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Quotations', href: '/admin/quotations', icon: FileText },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: RotateCw },
    { name: 'Invoices', href: '/admin/invoices', icon: Receipt },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Products & Variants', href: '/admin/products', icon: Package },
    { name: 'Subscription Plans', href: '/admin/plans', icon: CalendarCheck },
    { name: 'Tax Rules', href: '/admin/taxes', icon: Percent },
    { name: 'Discount Rules', href: '/admin/discounts', icon: Percent },
    { name: 'Billing Engine', href: '/admin/billing-jobs', icon: RotateCw },
    { name: 'Users & Staff', href: '/admin/users', icon: Users },
    { name: 'Financial Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Billing Simulator', href: '/admin/simulator', icon: Calculator },
    { name: 'Audit Trail', href: '/admin/audit-logs', icon: History },
    { name: 'Alert Center', href: '/admin/alerts', icon: Bell },
  ];

  const staffNav: NavItem[] = [
    { name: 'Operational Desk', href: '/admin', icon: LayoutDashboard },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Quotations', href: '/admin/quotations', icon: FileText },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: RotateCw },
    { name: 'Invoices', href: '/admin/invoices', icon: Receipt },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Plans', href: '/admin/plans', icon: CalendarCheck },
    { name: 'Taxes', href: '/admin/taxes', icon: Percent },
    { name: 'Discounts', href: '/admin/discounts', icon: Percent },
    { name: 'Billing Simulator', href: '/admin/simulator', icon: Calculator },
    { name: 'Alert Center', href: '/admin/alerts', icon: Bell },
  ];

  const navigation = isStaff ? staffNav : adminNav;

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300
          transition-all duration-300 ease-in-out
          md:static md:translate-x-0
          ${sidebarWidth}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand header */}
        <div
          className={`
            h-16 flex items-center border-b border-slate-800 shrink-0
            ${collapsed ? 'justify-center px-2' : 'px-5 gap-3'}
          `}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/40">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white tracking-tight leading-tight">
                Brightloop
              </span>
              <span className="block text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                {isStaff ? 'Staff Desk' : 'Admin'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onMobileClose}
                title={collapsed ? item.name : undefined}
                className={`
                  flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium
                  transition-all duration-150 group relative
                  ${collapsed ? 'justify-center' : ''}
                  ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/50'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />

                {!collapsed && (
                  <span className="truncate">{item.name}</span>
                )}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="
                    absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-xs font-medium
                    bg-slate-800 text-white whitespace-nowrap
                    opacity-0 group-hover:opacity-100
                    pointer-events-none
                    transition-opacity duration-150
                    z-50 shadow-lg border border-slate-700
                  ">
                    {item.name}
                  </div>
                )}

                {/* Active indicator dot when collapsed */}
                {collapsed && isActive && (
                  <span className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User bar */}
        <div className={`border-t border-slate-800 p-3 shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!collapsed && (
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <span className={`
                text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0
                ${isStaff
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                }
              `}>
                {user?.role}
              </span>
            </div>
          )}

          <button
            onClick={() => logout()}
            title="Log Out"
            className={`
              flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium
              text-slate-400 hover:text-rose-400 hover:bg-slate-800/80
              transition-all w-full
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
            hidden md:flex
            absolute -right-3 top-20
            w-6 h-6 rounded-full
            bg-slate-800 border border-slate-700
            text-slate-400 hover:text-white hover:bg-slate-700
            items-center justify-center
            transition-all duration-200
            shadow-md
            z-10
          "
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>
    </>
  );
};
