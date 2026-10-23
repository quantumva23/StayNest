import React from 'react';
import { Home, Shield, Award, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1F2421] text-[#E6E1D8] pt-16 pb-12 border-t border-[#313A35]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#313A35]">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-staynest-terracotta flex items-center justify-center text-white">
                <Home className="w-4 h-4" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                StayNest
              </span>
            </div>
            <p className="text-xs text-[#A6A095] leading-relaxed">
              Curated boutique hotels, tranquil alpine lounges, and authentic heritage guest houses. Transparent pricing and secure reservations.
            </p>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#2B332E] text-[11px] text-[#A6A095]">
              <Sparkles className="w-3.5 h-3.5 text-staynest-terracotta" />
              <span>Full-Stack Portfolio Project</span>
            </div>
          </div>

          {/* Stays by Type */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Explore Types
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A6A095]">
              <li><a href="/explore?type=HOTEL" className="hover:text-white transition-colors">Boutique & Heritage Hotels</a></li>
              <li><a href="/explore?type=LOUNGE" className="hover:text-white transition-colors">Scenic Alpine & Forest Lounges</a></li>
              <li><a href="/explore?type=GUEST_HOUSE" className="hover:text-white transition-colors">Coastal & Homestay Guest Houses</a></li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Guarantees
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A6A095]">
              <li className="flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Client-Trust Pricing</span>
              </li>
              <li className="flex items-center space-x-2">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Serialized Inventory Locking</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Idempotent Verified Payments</span>
              </li>
            </ul>
          </div>

          {/* Quick Demo Credentials */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Demo Access
            </h4>
            <div className="bg-[#2B332E] p-3 rounded-xl border border-[#3E4A42] space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-staynest-terracotta block">Demo Guest:</span>
                <code className="text-[11px] text-white">guest@staynest.dev / password123</code>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-staynest-olive-light block">Demo Host:</span>
                <code className="text-[11px] text-white">host@staynest.dev / password123</code>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-300 block">Demo Admin:</span>
                <code className="text-[11px] text-white">admin@staynest.dev / password123</code>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#827D73]">
          <p>© {new Date().getFullYear()} StayNest. Student portfolio demonstration. Not an active commercial booking portal.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <span>Powered by React, Express & PostgreSQL</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
