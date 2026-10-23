import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { SearchBar } from '../components/search/SearchBar';
import { PropertyCard, PropertyCardData } from '../components/property/PropertyCard';
import { ShieldCheck, Compass, Sparkles, Bed, Mountain, Castle, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data, isLoading, error } = useQuery<{ properties: PropertyCardData[] }>({
    queryKey: ['featured-properties', selectedCategory],
    queryFn: () =>
      apiFetch<{ properties: PropertyCardData[] }>(
        `/properties?limit=6${selectedCategory ? `&type=${selectedCategory}` : ''}`
      ),
  });

  const categories = [
    { id: '', label: 'All Stays', icon: Compass },
    { id: 'HOTEL', label: 'Boutique Hotels', icon: Bed },
    { id: 'LOUNGE', label: 'Scenic Lounges', icon: Mountain },
    { id: 'GUEST_HOUSE', label: 'Heritage Guest Houses', icon: Castle },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-staynest-olive-light/60 border border-staynest-olive/20 text-staynest-olive text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-staynest-terracotta" />
          <span>Curated Boutique Accommodations</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-staynest-charcoal max-w-4xl mx-auto leading-[1.1]">
          Discover places with soul.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-staynest-muted max-w-2xl mx-auto leading-relaxed">
          From tranquil lakeside havelis and alpine forest retreats to sun-drenched coastal villas. Book with real-time room inventory holds and verified zero hidden fees.
        </p>

        {/* Search Bar */}
        <div className="mt-10">
          <SearchBar />
        </div>
      </section>

      {/* Category Pills & Featured Stays */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-serif text-3xl font-bold text-staynest-charcoal">
              Handpicked Featured Stays
            </h2>
            <p className="text-sm text-staynest-muted mt-1">
              Properties chosen for architectural character and authentic hospitality.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-staynest-charcoal text-white border-staynest-charcoal shadow-sm'
                      : 'bg-white text-staynest-charcoal border-[#E6E1D8] hover:border-staynest-charcoal'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-[#E6E1D8]" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#E6E1D8] p-8">
            <p className="text-staynest-muted text-sm">Failed to load listings. Please ensure server is running.</p>
          </div>
        ) : data?.properties && data.properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#E6E1D8]">
            <p className="text-staynest-muted text-sm">No properties found in this category.</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/explore"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-staynest-sand hover:bg-[#EBE5D8] text-staynest-charcoal font-semibold text-sm transition-colors border border-[#E6E1D8]"
          >
            <span>Explore all destinations & stays</span>
            <ArrowRight className="w-4 h-4 text-staynest-terracotta" />
          </Link>
        </div>
      </section>

      {/* Trust & Architectural Guarantees */}
      <section className="bg-white border-y border-[#E6E1D8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-3xl font-bold text-staynest-charcoal">
              Crafted for confidence & delight
            </h2>
            <p className="text-sm text-staynest-muted mt-2">
              StayNest combines modern engineering safety with old-world warm hospitality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-olive/10 flex items-center justify-center text-staynest-olive">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                Concurrency-Safe Booking Holds
              </h3>
              <p className="text-xs text-staynest-muted leading-relaxed">
                When you initiate a reservation, our PostgreSQL interactive transaction locks the room inventory hold for 15 minutes, preventing double-booking even under peak demand.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-terracotta/10 flex items-center justify-center text-staynest-terracotta">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                Transparent Server Quotes
              </h3>
              <p className="text-xs text-staynest-muted leading-relaxed">
                Every rupee is calculated on the server with snapshotted night rates and transparent platform fees. The checkout amount is verified against provider signatures.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-olive/10 flex items-center justify-center text-staynest-olive">
                <Castle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                Direct Host Communication
              </h3>
              <p className="text-xs text-staynest-muted leading-relaxed">
                Hosts manage room pools and reservations directly with dedicated portal tools, ensuring genuine care from check-in to check-out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Host CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-staynest-charcoal text-white p-8 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-staynest-terracotta">
              Earn as a Host
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Open your doors to thoughtful travelers.
            </h2>
            <p className="text-sm text-[#A6A095] leading-relaxed">
              List your boutique hotel, alpine lounge, or family guest house. Manage your inventory, configure room rates, and receive verified guest bookings.
            </p>
          </div>

          <Link
            to="/host/properties/new"
            className="shrink-0 px-6 py-3.5 rounded-full bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white font-semibold text-sm transition-all shadow-md hover:scale-105"
          >
            Start Hosting on StayNest
          </Link>
        </div>
      </section>
    </div>
  );
};
