import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          passwordConfirmation,
          companyName,
          phone,
        }),
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        navigate('/portal');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      if (err.errors) {
        setFieldErrors(err.errors);
      }
    } finally {
      setLoading(false);
    }
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
          Create your customer account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              error={fieldErrors['name']?.[0]}
            />

            <Input
              label="Business Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              error={fieldErrors['email']?.[0]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Company Name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
              />
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                error={fieldErrors['password']?.[0]}
              />

              {/* Password complexity indicators */}
              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] grid grid-cols-2 gap-1 text-slate-500">
                <span className={hasMinLength ? 'text-emerald-600 font-medium' : ''}>
                  {hasMinLength ? '✓' : '•'} 8+ characters
                </span>
                <span className={hasUpper ? 'text-emerald-600 font-medium' : ''}>
                  {hasUpper ? '✓' : '•'} 1 uppercase letter
                </span>
                <span className={hasLower ? 'text-emerald-600 font-medium' : ''}>
                  {hasLower ? '✓' : '•'} 1 lowercase letter
                </span>
                <span className={hasSpecial && hasNumber ? 'text-emerald-600 font-medium' : ''}>
                  {hasSpecial && hasNumber ? '✓' : '•'} 1 number & special char
                </span>
              </div>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              required
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors['passwordConfirmation']?.[0]}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full justify-center mt-3"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
