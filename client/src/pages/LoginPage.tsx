import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth, User } from '../features/auth/AuthContext';
import { apiFetch, fieldErrors, messageForError } from '../lib/api';
import { Lock, Mail, ArrowRight, Sparkles, Home, Shield, User as UserIcon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const destinationFor = (role: User['role']) => {
    if (searchParams.get('redirect')) return redirect;
    if (role === 'HOST') return '/host';
    if (role === 'ADMIN') return '/admin';
    return '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFields({});
    setIsLoading(true);

    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.token, data.user);
      navigate(destinationFor(data.user.role));
    } catch (err: unknown) {
      setFields(fieldErrors(err));
      setError(messageForError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
    setFields({});
    setIsLoading(true);

    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: 'password123' }),
      });

      login(data.token, data.user);
      navigate(destinationFor(data.user.role));
    } catch (err: unknown) {
      setFields(fieldErrors(err));
      setError(messageForError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E6E1D8] shadow-subtle space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-staynest-terracotta flex items-center justify-center text-white mx-auto shadow-sm">
            <Home className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-staynest-charcoal">
            Welcome back
          </h1>
          <p className="text-xs text-staynest-muted">
            Log in to manage reservations, listings, and your StayNest account.
          </p>
        </div>

        {/* 1-Click Demo Logins */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E6E1D8]">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
            <Sparkles className="w-3.5 h-3.5 text-staynest-terracotta" />
            <span>Fast Demo Logins (Portfolio Mode)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('guest@staynest.dev')}
              className="py-1.5 px-2 rounded-xl bg-white border border-[#E6E1D8] text-[11px] font-semibold text-staynest-charcoal hover:border-staynest-charcoal transition-colors flex items-center justify-center space-x-1"
            >
              <UserIcon className="w-3 h-3 text-staynest-muted" />
              <span>Guest</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('host@staynest.dev')}
              className="py-1.5 px-2 rounded-xl bg-white border border-[#E6E1D8] text-[11px] font-semibold text-staynest-olive hover:border-staynest-olive transition-colors flex items-center justify-center space-x-1"
            >
              <Home className="w-3 h-3 text-staynest-olive" />
              <span>Host</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@staynest.dev')}
              className="py-1.5 px-2 rounded-xl bg-white border border-[#E6E1D8] text-[11px] font-semibold text-purple-700 hover:border-purple-600 transition-colors flex items-center justify-center space-x-1"
            >
              <Shield className="w-3 h-3 text-purple-600" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {error && Object.keys(fields).length === 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-staynest-muted absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full text-xs font-semibold pl-10 pr-3 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none focus:border-staynest-charcoal"
              />
              {fields.email && <p className="text-[11px] text-red-700 mt-1">{fields.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-staynest-muted absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs font-semibold pl-10 pr-3 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none focus:border-staynest-charcoal"
              />
              {fields.password && <p className="text-[11px] text-red-700 mt-1">{fields.password}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-staynest-muted">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-staynest-terracotta hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
