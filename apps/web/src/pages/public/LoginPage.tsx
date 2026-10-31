import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        if (res.data.user.role === 'CUSTOMER') {
          navigate('/portal');
        } else {
          navigate('/admin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Brightloop
          </span>
        </Link>
        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Or{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            create a new customer account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full justify-center mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Development Demo Credentials Chips */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider text-center">
              Quick Development Demo Logins
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin@brightloop.com', 'Admin@Brightloop2026!')}
                className="p-2 rounded border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 transition-colors text-center"
              >
                <span className="font-bold block text-indigo-700">Admin</span>
                <span className="text-[10px] text-slate-500 truncate block">admin@brightloop.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('staff@brightloop.com', 'Staff@Brightloop2026!')}
                className="p-2 rounded border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 transition-colors text-center"
              >
                <span className="font-bold block text-indigo-700">Staff</span>
                <span className="text-[10px] text-slate-500 truncate block">staff@brightloop.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('john.doe@example.com', 'Customer@Brightloop2026!')}
                className="p-2 rounded border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 transition-colors text-center"
              >
                <span className="font-bold block text-indigo-700">Customer</span>
                <span className="text-[10px] text-slate-500 truncate block">john.doe@example.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
