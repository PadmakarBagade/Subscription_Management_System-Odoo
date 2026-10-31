import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCw,
  Receipt,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Percent,
  Bell,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Layers,
  Sparkles,
  Zap,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiRequest } from '../../services/api';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Dynamic public plans from backend
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Product preview tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscriptions' | 'invoices' | 'portal'>('dashboard');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await apiRequest('/public/plans');
        if (res.success && Array.isArray(res.data)) {
          setPlans(res.data);
        }
      } catch {
        // Fallback or empty state
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError('');
    try {
      const res = await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify(contactForm),
      });
      if (res.success) {
        setContactSuccess(true);
        setContactForm({ name: '', email: '', company: '', message: '' });
      }
    } catch (err: any) {
      setContactError(err.message || 'Failed to submit message');
    } finally {
      setContactSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How does the automated recurring billing engine work?',
      a: 'Brightloop utilizes an idempotent scheduled background engine. Subscriptions are billed according to their frequency (Daily, Weekly, Monthly, Yearly) using robust calendar date arithmetic that correctly handles month-end pinning and leap years. Duplicate invoices are strictly prevented via unique database period constraints.',
    },
    {
      q: 'How are Razorpay online payments verified and processed?',
      a: 'When checkout begins, the backend calculates the authoritative balance and creates a signed Razorpay order. Upon completion, the backend independently verifies the HMAC-SHA256 signature using your secret key before marking invoices paid or activating subscriptions.',
    },
    {
      q: 'Can staff record offline manual payments?',
      a: 'Yes. Authorized staff can record manual payments (bank transfer, UPI, cash, cheque). Payments can be partial or in full, automatically reducing the invoice balance and updating customer statements.',
    },
    {
      q: 'How are taxes and discounts calculated on invoices?',
      a: 'Configurable tax rules (including standard Indian GST with CGST, SGST, and IGST breakdowns) are automatically calculated on net taxable amounts. When an invoice is confirmed, permanent historical tax snapshots are preserved so future rule changes never alter past financial records.',
    },
    {
      q: 'Can customers pause or renew their subscriptions?',
      a: 'Yes, if the plan policy permits. Administrators configure pause, early closure, and renewal permissions per plan. Customers can manage permitted actions directly from their self-service portal.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen Subscription Management & Billing Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Every Subscription. Every Invoice.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-teal-300 to-emerald-400">
              One Intelligent Platform.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Manage subscriptions, automate recurring billing, collect payments, and understand your revenue from one powerful workspace.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto shadow-lg shadow-indigo-600/30 text-base"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started Free
            </Button>
            <a
              href="#preview"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors"
            >
              Explore Live Preview
            </a>
          </div>

          {/* Live Product Dashboard Preview (Real Components) */}
          <div className="mt-16 max-w-5xl mx-auto rounded-2xl p-2 bg-slate-800/40 border border-slate-700/60 backdrop-blur-xl shadow-2xl">
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 text-left">
              {/* Window Header */}
              <div className="h-10 bg-slate-800/80 px-4 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400">brightloop.internal/admin/overview</span>
                </div>
                <div className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live System Ready
                </div>
              </div>

              {/* Real Mock Dashboard UI */}
              <div className="p-6 bg-slate-950 space-y-6">
                {/* Metric Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Total Invoiced</span>
                    <p className="text-xl font-bold text-white mt-1">₹48,920.00</p>
                    <span className="text-[11px] text-emerald-400 mt-1 block">↑ +14.2% this month</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Collected Revenue</span>
                    <p className="text-xl font-bold text-emerald-400 mt-1">₹42,560.00</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">via Razorpay & Wire</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Active Subscriptions</span>
                    <p className="text-xl font-bold text-white mt-1">128</p>
                    <span className="text-[11px] text-indigo-400 mt-1 block">100% verified</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Overdue Invoices</span>
                    <p className="text-xl font-bold text-rose-400 mt-1">1</p>
                    <span className="text-[11px] text-rose-400/80 mt-1 block">Auto-reminders sent</span>
                  </div>
                </div>

                {/* Subscriptions Mini Table */}
                <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Recent Subscription Orders
                    </span>
                    <Badge status="ACTIVE" />
                  </div>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Acme Innovations Pvt Ltd</p>
                        <p className="text-slate-400">Growth Business Suite • Odoo Connector</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">₹4,790.80 / mo</p>
                        <span className="text-emerald-400">Paid • Next renewal in 28 days</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Nexus Digital Systems</p>
                        <p className="text-slate-400">Starter Cloud Plan • Standard</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">₹2,360.00 / mo</p>
                        <span className="text-rose-400">Overdue notice dispatched</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Value Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Centralized Subscription Management
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Engineered for absolute accuracy and zero revenue leakage
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">Reduce Manual Billing</h3>
              <p className="mt-1 text-xs text-slate-500">Automate monthly and yearly renewals with zero manual intervention.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">Organized Subscriptions</h3>
              <p className="mt-1 text-xs text-slate-500">Track plans, variant adjustments, and customer contracts in one place.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">Track Outstanding Balances</h3>
              <p className="mt-1 text-xs text-slate-500">Instant visibility into pending, partially paid, and overdue invoices.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">Automate Renewals</h3>
              <p className="mt-1 text-xs text-slate-500">Send proactive notifications and prevent unintentional customer churn.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-bold">
                5
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">Financial Visibility</h3>
              <p className="mt-1 text-xs text-slate-500">Accurately separate invoiced totals from actual collected revenue.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (8 Distinct Cards) */}
      <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Comprehensive Feature Suite
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Every tool required to manage a subscription-based software enterprise
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Subscription Management */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <RotateCw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Subscription Management</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Full lifecycle support from DRAFT to QUOTATION, CONFIRMED, ACTIVE, PAUSED, and CLOSED with explicit state validations.
              </p>
            </div>

            {/* 2. Recurring Billing */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Recurring Billing Engine</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Idempotent background processor. Generates billing period invoices, advances billing dates, and eliminates duplicate invoices.
              </p>
            </div>

            {/* 3. Invoice Management */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Invoice Management</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Immutability once confirmed. Preserves line item snapshots, tax rates, discounts, balance tracking, and server-side PDF generation.
              </p>
            </div>

            {/* 4. Razorpay Payments */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Razorpay Payments</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Seamless online checkout with UPI, cards, and netbanking. Cryptographic HMAC-SHA256 signature verification and webhook idempotency.
              </p>
            </div>

            {/* 5. Tax & Discount Management */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
                <Percent className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Tax & Discount Engine</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Configurable Indian GST (CGST, SGST, IGST), percentage/fixed discounts, minimum purchase amounts, and usage limit enforcement.
              </p>
            </div>

            {/* 6. Customer Self-Service */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-5">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Customer Self-Service</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Dedicated portal for customers to manage subscriptions, view invoices, make online payments, and download official PDF tax receipts.
              </p>
            </div>

            {/* 7. Revenue Analytics */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Revenue Analytics</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Database-backed metrics, monthly collections trends, plan performance, and clear accounting distinction between invoiced and paid revenue.
              </p>
            </div>

            {/* 8. Automated Reminders */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Reminders</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Scheduled background notifications for upcoming renewals, overdue invoices, and administrative alerts on failed payment attempts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (4-Step Timeline) */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Automated Billing Workflow
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Four steps from product setup to collected revenue
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-100 text-left">
              <span className="text-4xl font-extrabold text-indigo-600/20 block mb-2">01</span>
              <h3 className="text-base font-bold text-slate-900">Set Up Products & Plans</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Define base prices, variant adjustments (e.g. Odoo connector, storage tiers), and billing frequencies.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-100 text-left">
              <span className="text-4xl font-extrabold text-indigo-600/20 block mb-2">02</span>
              <h3 className="text-base font-bold text-slate-900">Create Subscriptions</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Customers select plans online or sales representatives generate and confirm formal quotations.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-100 text-left">
              <span className="text-4xl font-extrabold text-indigo-600/20 block mb-2">03</span>
              <h3 className="text-base font-bold text-slate-900">Automate & Collect</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Billing engine automatically generates cycle invoices; customers pay via Razorpay or staff records offline payments.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-100 text-left">
              <span className="text-4xl font-extrabold text-indigo-600/20 block mb-2">04</span>
              <h3 className="text-base font-bold text-slate-900">Track & Reconcile</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Finance team tracks outstanding balances, monitors aging invoices, and analyzes revenue trends in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview Section (Interactive Tabs) */}
      <section id="preview" className="py-20 bg-slate-100/60 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Real UI Component Previews
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Inspect actual platform components before logging in
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-10 flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {[
              { id: 'dashboard', label: 'Admin Dashboard' },
              { id: 'subscriptions', label: 'Subscription Engine' },
              { id: 'invoices', label: 'Tax Invoice Detail' },
              { id: 'portal', label: 'Customer Portal' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="mt-8 max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Financial Overview</h3>
                    <p className="text-xs text-slate-500">Live aggregated metrics from PostgreSQL</p>
                  </div>
                  <Badge status="ACTIVE" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500">Total Invoiced</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">₹48,920.00</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-xs text-emerald-700 font-medium">Collected Revenue</span>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">₹42,560.00</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-xs text-rose-700 font-medium">Outstanding Balance</span>
                    <p className="text-2xl font-bold text-rose-700 mt-1">₹6,360.00</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Subscription Lifecycle Engine</h3>
                    <p className="text-xs text-slate-500">Active status transitions with pause & renewal</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                    DRAFT → CONFIRMED → ACTIVE → CLOSED
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subscription Number:</span>
                    <span className="font-mono font-semibold">SUB-2026-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Plan:</span>
                    <span className="font-semibold">Growth Business Suite (Monthly)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Selected Variant:</span>
                    <span className="text-indigo-600 font-medium">Odoo Brand Connector (+₹560.00)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Next Billing Date:</span>
                    <span className="font-semibold text-emerald-600">Nov 30, 2026</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Official Tax Invoice Detail</h3>
                    <p className="text-xs text-slate-500">Immutable snapshot with GST breakdown and PDF generation</p>
                  </div>
                  <Badge status="PAID" />
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      <tr>
                        <td className="p-3 font-medium">Brightloop Cloud Core ERP (Odoo Connector)</td>
                        <td className="p-3 text-center">1</td>
                        <td className="p-3 text-right">₹2,560.00</td>
                        <td className="p-3 text-right">₹2,560.00</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Automated Recurring Billing Engine</td>
                        <td className="p-3 text-center">1</td>
                        <td className="p-3 text-right">₹1,500.00</td>
                        <td className="p-3 text-right">₹1,500.00</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-slate-600">GST 18% (CGST 9% + SGST 9%):</td>
                        <td className="p-3 text-right">₹730.80</td>
                      </tr>
                      <tr className="text-sm">
                        <td colSpan={3} className="p-3 text-right font-bold text-slate-900">Total Paid:</td>
                        <td className="p-3 text-right font-bold text-indigo-600">₹4,790.80</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'portal' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Customer Self-Service Interface</h3>
                    <p className="text-xs text-slate-500">Strict ownership verification: customers only see their records</p>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => navigate('/login')}>
                    Sign In to Portal
                  </Button>
                </div>
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-2">
                  <p className="font-semibold">Features available in customer portal:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>One-click Razorpay checkout for pending balances</li>
                    <li>Instant downloadable PDF invoices and receipts</li>
                    <li>Self-service pause, resume, and plan renewal controls</li>
                    <li>Update company billing details and GSTIN records</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dynamic Pricing Section */}
      <section id="pricing" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Transparent Pricing Plans
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Choose the right billing package for your team
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Active plans dynamically loaded from the platform backend.
            </p>
          </div>

          {loadingPlans ? (
            <div className="mt-12 flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-12 text-center text-slate-500 py-8">
              No public plans are active currently. Please contact sales for custom deployment.
            </div>
          ) : (
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-600 p-8 flex flex-col justify-between transition-all hover:shadow-xl relative"
                >
                  {p.code === 'PLAN_BUSINESS' && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                    <p className="mt-2 text-xs text-slate-500 min-h-[36px]">{p.description}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">
                        ₹{Number(p.basePrice).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 uppercase font-semibold">
                        / {p.billingFrequency.toLowerCase()}
                      </span>
                    </div>

                    {/* Features list */}
                    <div className="mt-8 border-t border-slate-100 pt-6 space-y-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Frequency: {p.billingFrequency} automated billing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Min quantity: {p.minimumQuantity} seat(s)</span>
                      </div>
                      {p.allowPause && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>Self-service pause permitted</span>
                        </div>
                      )}
                      {p.allowRenewal && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>Auto-renewal & reminder support</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button
                      variant={p.code === 'PLAN_BUSINESS' ? 'primary' : 'outline'}
                      className="w-full justify-center"
                      onClick={() => navigate('/register')}
                    >
                      Get Started with {p.name}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section (Accordion) */}
      <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Everything you need to know about Brightloop
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-slate-900 hover:text-indigo-600"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Get in Touch
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              Contact our solutions engineering team
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Have enterprise integration requirements or need a tailored billing consultation?
            </p>
          </div>

          <div className="mt-12 bg-slate-50 rounded-2xl border border-slate-200 p-8 shadow-sm">
            {contactSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-lg font-bold">Inquiry Received</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Thank you! Our billing architects have received your submission and will get in touch shortly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setContactSuccess(false)}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {contactError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Business Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="e.g. john@company.com"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    placeholder="e.g. Acme Innovations Pvt Ltd"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Message / Billing Needs <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Tell us about your subscribers, billing frequency, and integration requirements..."
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={contactSubmitting}
                  className="w-full justify-center"
                  icon={<Send className="w-4 h-4" />}
                >
                  Send Inquiry
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
