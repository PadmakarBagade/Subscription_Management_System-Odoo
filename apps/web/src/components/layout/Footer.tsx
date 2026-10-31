import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Brightloop
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unified subscription lifecycle, recurring billing automation, and financial intelligence platform for modern software companies.
            </p>
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Outer Ring Road, Bengaluru, KA 560103</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>billing@brightloopsoftware.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>+91 80 4000 1234</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Subscription Lifecycle
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Recurring Billing Engine
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Tax & GST Management
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Razorpay Checkout
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Solutions & Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Solutions
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/portal" className="hover:text-white transition-colors">
                  Customer Self-Service
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Admin Workspace
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Documentation & FAQ
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Sales Consultation
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Security & Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-slate-400">Strict RBAC Authorization</span>
              </li>
              <li>
                <span className="text-slate-400">HMAC-SHA256 Webhook Security</span>
              </li>
              <li>
                <span className="text-slate-400">ACID Transactional Billing</span>
              </li>
              <li>
                <span className="text-slate-400">Terms of Service</span>
              </li>
              <li>
                <span className="text-slate-400">Privacy Policy</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Brightloop Software Pvt Ltd. All rights reserved.</p>
          <p className="mt-2 md:mt-0">
            Designed for enterprise reliability, high accuracy, and seamless billing.
          </p>
        </div>
      </div>
    </footer>
  );
};
