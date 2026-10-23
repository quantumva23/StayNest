import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Compass, User as UserIcon, LogOut, PlusCircle, ShieldCheck, Home, Menu, X, Calendar } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF7]/90 backdrop-blur-md border-b border-[#E6E1D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-staynest-terracotta flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Home className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-tight text-staynest-charcoal leading-none">
                StayNest
              </span>
              <span className="text-[10px] uppercase tracking-wider text-staynest-muted font-medium mt-0.5">
                Authentic Stays
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/explore"
              className="flex items-center space-x-1.5 text-sm font-medium text-staynest-charcoal hover:text-staynest-terracotta transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Stays</span>
            </Link>

            {user?.role === 'HOST' || user?.role === 'ADMIN' ? (
              <Link
                to="/host"
                className="text-sm font-medium text-staynest-olive hover:text-staynest-charcoal transition-colors px-3 py-1.5 rounded-full bg-staynest-olive-light/50"
              >
                Host Dashboard
              </Link>
            ) : (
              <Link
                to="/host/properties/new"
                className="text-sm font-medium text-staynest-muted hover:text-staynest-charcoal transition-colors"
              >
                Become a Host
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="flex items-center space-x-1 text-sm font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Right Action / Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pl-3 rounded-full border border-[#E6E1D8] bg-white hover:shadow-subtle transition-all"
                >
                  <span className="text-xs font-semibold text-staynest-charcoal max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-staynest-sand flex items-center justify-center text-staynest-olive font-semibold text-xs border border-[#E6E1D8]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-modal border border-[#E6E1D8] py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-staynest-sand text-staynest-olive">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      to="/account/bookings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#FAFAF7]"
                    >
                      <Calendar className="w-4 h-4 text-staynest-muted" />
                      <span>My Reservations</span>
                    </Link>

                    {(user.role === 'HOST' || user.role === 'ADMIN') && (
                      <Link
                        to="/host"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#FAFAF7]"
                      >
                        <Home className="w-4 h-4 text-staynest-muted" />
                        <span>Host Listings</span>
                      </Link>
                    )}

                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-staynest-charcoal hover:text-staynest-terracotta transition-colors px-3 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-staynest-terracotta hover:bg-staynest-terracotta-dark transition-all px-4 py-2 rounded-full shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-staynest-charcoal hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E6E1D8] bg-[#FAFAF7] px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-staynest-charcoal hover:bg-gray-100"
          >
            Explore Stays
          </Link>
          {user ? (
            <>
              <Link
                to="/account/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-staynest-charcoal hover:bg-gray-100"
              >
                My Reservations
              </Link>
              {(user.role === 'HOST' || user.role === 'ADMIN') && (
                <Link
                  to="/host"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-staynest-olive hover:bg-gray-100"
                >
                  Host Dashboard
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-purple-700 hover:bg-purple-50"
                >
                  Admin Console
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
              >
                Sign Out ({user.name})
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-[#E6E1D8] font-semibold text-staynest-charcoal"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-staynest-terracotta text-white font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
