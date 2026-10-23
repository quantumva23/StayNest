import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, User } from '../features/auth/AuthContext';
import { apiFetch } from '../lib/api';
import { Lock, Mail, User as UserIcon, Home, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'GUEST' | 'HOST'>('GUEST');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });

      login(data.token, data.user);
      navigate(role === 'HOST' ? '/host' : '/explore');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
            Join StayNest
          </h1>
          <p className="text-xs text-staynest-muted">
            Create an account to book stays or list your property.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-staynest-muted absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full text-xs font-semibold pl-10 pr-3 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none focus:border-staynest-charcoal"
              />
            </div>
          </div>

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
                placeholder="rohan@example.com"
                className="w-full text-xs font-semibold pl-10 pr-3 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none focus:border-staynest-charcoal"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Password (Min. 6 chars)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-staynest-muted absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs font-semibold pl-10 pr-3 py-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none focus:border-staynest-charcoal"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('GUEST')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all ${
                  role === 'GUEST'
                    ? 'border-staynest-charcoal bg-staynest-charcoal text-white'
                    : 'border-[#E6E1D8] bg-[#FAFAF7] text-staynest-charcoal'
                }`}
              >
                Guest (Book Stays)
              </button>
              <button
                type="button"
                onClick={() => setRole('HOST')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all ${
                  role === 'HOST'
                    ? 'border-staynest-olive bg-staynest-olive text-white'
                    : 'border-[#E6E1D8] bg-[#FAFAF7] text-staynest-charcoal'
                }`}
              >
                Host (List Stays)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-staynest-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-staynest-terracotta hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};
