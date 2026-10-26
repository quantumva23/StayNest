import React from 'react';
import { Home } from 'lucide-react';

const footerLinks = {
  Explore: [
    { label: 'All Stays', href: '/explore' },
    { label: 'Boutique Hotels', href: '/explore?type=HOTEL' },
    { label: 'Guest Houses', href: '/explore?type=GUEST_HOUSE' },
    { label: 'Lounges', href: '/explore?type=LOUNGE' },
  ],
  Account: [
    { label: 'Sign In', href: '/login' },
    { label: 'Create Account', href: '/register' },
    { label: 'My Reservations', href: '/account/bookings' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

const linkClass =
  'text-sm text-[#B8B5AC] transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:underline';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#343A35] bg-[#1F2421] text-[#E6E1D8]">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-10 border-b border-[#343A35] pb-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-2">
            <a
              href="/"
              aria-label="StayNest home"
              className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C77D5B]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-staynest-terracotta text-white">
                <Home className="h-5 w-5" aria-hidden="true" />
              </span>

              <span className="font-serif text-2xl font-semibold tracking-tight text-white">
                StayNest
              </span>
            </a>

            <p className="max-w-sm text-sm leading-7 text-[#B8B5AC]">
              Discover thoughtfully selected stays, from distinctive boutique
              hotels to welcoming guest houses. Find a place that feels like
              yours.
            </p>

            <p className="text-xs tracking-wide text-[#827D73]">
              Thoughtful stays. Memorable journeys.
            </p>
          </div>

          {/* Explore */}
          <nav aria-label="Explore stays">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Explore
            </h2>

            <ul className="space-y-3">
              {footerLinks.Explore.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Account */}
          <nav aria-label="Account">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Your Account
            </h2>

            <ul className="space-y-3">
              {footerLinks.Account.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Support */}
          <nav aria-label="Customer support">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Information
            </h2>

            <ul className="space-y-3">
              {footerLinks.Support.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 pt-6 text-xs text-[#827D73] sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} StayNest. All rights reserved.
          </p>

          <p>Made for better stays and memorable journeys.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;