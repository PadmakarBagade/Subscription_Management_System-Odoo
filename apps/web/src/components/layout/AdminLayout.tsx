import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Sparkles,
  Bell,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AiAssistantDrawer } from '../ai/AiAssistantDrawer';
import { Sidebar, SidebarProvider } from './Sidebar';

// Inner layout that consumes the sidebar context
const AdminLayoutInner: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const isStaff = user?.role === 'STAFF';

  // Build a human-readable breadcrumb from the URL
  const pageName = (() => {
    const segment = location.pathname.replace('/admin/', '').replace('/admin', '');
    if (!segment) return 'Dashboard';
    return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  })();

  return (
    <div className="min-h-screen bg-slate-100/60 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300`}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0 shadow-sm">
          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="flex items-center gap-1.5 text-sm text-slate-500">
              <Link
                to="/admin"
                className="hover:text-indigo-600 font-medium transition-colors"
              >
                {isStaff ? 'Staff' : 'Admin'}
              </Link>
              {pageName !== 'Dashboard' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className="font-semibold text-slate-800">{pageName}</span>
                </>
              )}
            </nav>
          </div>

          {/* Right: role badge + AI + alerts + avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Badge */}
            <span
              className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isStaff
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {isStaff ? 'Staff' : 'Admin'}
            </span>

            {/* AI Assistant */}
            <button
              onClick={() => setAiDrawerOpen(true)}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-gradient-to-r from-indigo-50 to-violet-50
                text-indigo-700 border border-indigo-200
                hover:from-indigo-100 hover:to-violet-100
                transition-all shadow-xs
              "
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            {/* Alerts */}
            <Link
              to="/admin/alerts"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
              title="Alert Center"
            >
              <Bell className="w-5 h-5" />
            </Link>

            {/* Avatar */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div
                className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm ${
                  isStaff ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                {user?.name?.charAt(0)?.toUpperCase() || (isStaff ? 'S' : 'A')}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{user?.email}</p>
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

// Outer layout wraps everything in SidebarProvider
export const AdminLayout: React.FC = () => (
  <SidebarProvider>
    <AdminLayoutInner />
  </SidebarProvider>
);
