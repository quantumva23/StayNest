import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch, messageForError } from '../lib/api';
import { SearchBar } from '../components/search/SearchBar';
import { PropertyCard, PropertyCardData } from '../components/property/PropertyCard';
import { useAuth } from '../features/auth/AuthContext';
import { ShieldCheck, Compass, Sparkles, Bed, Mountain, Castle, ArrowRight, Home, Users } from 'lucide-react';

interface CatalogItem {
  id: string;
  label: string;
  count: number;
}

interface Catalog {
  propertyTypes: CatalogItem[];
  roomTypes: CatalogItem[];
  cities: Array<{ id: string; name: string; slug: string; state?: string | null; count: number }>;
}

const roomIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  STANDARD: Bed,
  DELUXE: Sparkles,
  SUITE: Castle,
  STUDIO: Home,
  CABIN: Mountain,
  FAMILY: Users,
};

const propertyIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  HOTEL: Bed,
  LOUNGE: Mountain,
  GUEST_HOUSE: Castle,
};

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [propertyType, setPropertyType] = useState('');
  const [roomType, setRoomType] = useState('');

  const catalogQuery = useQuery<Catalog>({
    queryKey: ['catalog'],
    queryFn: () => apiFetch<Catalog>('/properties/catalog'),
  });

  const listingsQuery = useQuery<{ properties: PropertyCardData[] }>({
    queryKey: ['featured-properties', propertyType, roomType],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '6' });
      if (propertyType) params.set('type', propertyType);
      if (roomType) params.set('roomType', roomType);
      return apiFetch<{ properties: PropertyCardData[] }>(`/properties?${params.toString()}`);
    },
  });

  const tripsQuery = useQuery<{ bookings: Array<{ id: string; status: string; checkIn: string; room: { name: string; roomType?: string; property: { name: string; city: string } } }> }>({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch('/bookings/me'),
    enabled: user?.role === 'GUEST',
  });

  const hostQuery = useQuery<{ properties: Array<{ id: string; name: string; city: string; type: string; rooms: Array<{ roomType: string }> }> }>({
    queryKey: ['host-properties'],
    queryFn: () => apiFetch('/host/properties'),
    enabled: user?.role === 'HOST' || user?.role === 'ADMIN',
  });

  const destinations = (catalogQuery.data?.cities || []).filter((city) => city.count > 0);

  return (
    <div className="space-y-20 pb-20">
      <section className="relative pt-12 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-staynest-olive-light/60 border border-staynest-olive/20 text-staynest-olive text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-staynest-terracotta" />
          <span>Curated Boutique Accommodations</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-staynest-charcoal max-w-4xl mx-auto leading-[1.1]">
          Discover places with soul.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-staynest-muted max-w-2xl mx-auto leading-relaxed">
          From tranquil lakeside havelis and alpine forest retreats to sun-drenched coastal villas. Book with real-time room inventory holds and verified zero hidden fees.
        </p>

        <div className="mt-10">
          <SearchBar />
        </div>
      </section>

      {user?.role === 'GUEST' && tripsQuery.data && tripsQuery.data.bookings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">Your trips</h2>
            <Link to="/account/bookings" className="text-xs font-semibold text-staynest-terracotta">View all</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {tripsQuery.data.bookings.slice(0, 4).map((booking) => (
              <Link
                key={booking.id}
                to="/account/bookings"
                className="min-w-[240px] bg-white border border-[#E6E1D8] rounded-3xl p-4 hover:-translate-y-1 transition-transform"
              >
                <p className="text-[11px] uppercase font-bold text-staynest-olive">{booking.status.replace('_', ' ')}</p>
                <p className="font-serif text-lg font-bold text-staynest-charcoal mt-1">{booking.room.property.name}</p>
                <p className="text-xs text-staynest-muted">{booking.room.property.city} · {booking.room.name}</p>
                <p className="text-xs text-staynest-muted mt-2">{new Date(booking.checkIn).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(user?.role === 'HOST' || user?.role === 'ADMIN') && hostQuery.data && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">Your listings</h2>
            <Link to="/host/properties/new" className="text-xs font-semibold text-staynest-terracotta">Publish a stay</Link>
          </div>
          {hostQuery.data.properties.length === 0 ? (
            <p className="text-sm text-staynest-muted">You have not published a stay yet.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {hostQuery.data.properties.slice(0, 4).map((property) => (
                <Link
                  key={property.id}
                  to={`/properties/${property.id}`}
                  className="min-w-[240px] bg-white border border-[#E6E1D8] rounded-3xl p-4 hover:-translate-y-1 transition-transform"
                >
                  <p className="text-[11px] uppercase font-bold text-staynest-olive">{property.type.replace('_', ' ')}</p>
                  <p className="font-serif text-lg font-bold text-staynest-charcoal mt-1">{property.name}</p>
                  <p className="text-xs text-staynest-muted">{property.city}</p>
                  <p className="text-xs text-staynest-muted mt-2">
                    {[...new Set(property.rooms.map((room) => room.roomType))].join(' · ') || 'No rooms yet'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-serif text-3xl font-bold text-staynest-charcoal">Handpicked Featured Stays</h2>
            <p className="text-sm text-staynest-muted mt-1">Filter by the stay type or the room style a host published.</p>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => { setPropertyType(''); setRoomType(''); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ${
                !propertyType ? 'bg-staynest-charcoal text-white border-staynest-charcoal' : 'bg-white text-staynest-charcoal border-[#E6E1D8]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>All Stays</span>
            </button>
            {(catalogQuery.data?.propertyTypes || []).map((cat) => {
              const Icon = propertyIcons[cat.id] || Compass;
              const isActive = propertyType === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setPropertyType(isActive ? '' : cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ${
                    isActive ? 'bg-staynest-charcoal text-white border-staynest-charcoal' : 'bg-white text-staynest-charcoal border-[#E6E1D8]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span className="opacity-70">{cat.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 mb-8">
          {(catalogQuery.data?.roomTypes || []).map((room) => {
            const Icon = roomIcons[room.id] || Bed;
            const isActive = roomType === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setRoomType(isActive ? '' : room.id)}
                className={`min-w-[140px] text-left p-4 rounded-3xl border transition-transform hover:-translate-y-1 ${
                  isActive ? 'bg-staynest-charcoal text-white border-staynest-charcoal' : 'bg-white text-staynest-charcoal border-[#E6E1D8]'
                }`}
              >
                <Icon className="w-4 h-4 mb-3" />
                <p className="font-serif text-lg font-bold">{room.label}</p>
                <p className={`text-[11px] mt-1 ${isActive ? 'text-white/70' : 'text-staynest-muted'}`}>{room.count} stays</p>
              </button>
            );
          })}
        </div>

        {listingsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-[#E6E1D8]" />
            ))}
          </div>
        ) : listingsQuery.error ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#E6E1D8] p-8 space-y-3">
            <p className="text-staynest-charcoal text-sm">{messageForError(listingsQuery.error)}</p>
            <button
              onClick={() => listingsQuery.refetch()}
              className="px-4 py-2 rounded-full bg-staynest-charcoal text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : listingsQuery.data?.properties && listingsQuery.data.properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {listingsQuery.data.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#E6E1D8] space-y-3">
            <p className="text-staynest-muted text-sm">No stays are published in this category yet.</p>
            <button
              onClick={() => { setPropertyType(''); setRoomType(''); }}
              className="px-4 py-2 rounded-full border border-[#E6E1D8] text-xs font-semibold"
            >
              Clear category
            </button>
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

      {destinations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-bold text-staynest-charcoal mb-6">Destinations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {destinations.map((city) => (
              <Link
                key={city.id}
                to={`/explore?city=${city.slug}`}
                className="bg-white border border-[#E6E1D8] rounded-3xl p-5 hover:-translate-y-1 transition-transform"
              >
                <p className="font-serif text-xl font-bold text-staynest-charcoal">{city.name}</p>
                <p className="text-xs text-staynest-muted mt-1">{city.count} stays</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border-y border-[#E6E1D8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-3xl font-bold text-staynest-charcoal">Crafted for confidence & delight</h2>
            <p className="text-sm text-staynest-muted mt-2">StayNest combines modern engineering safety with old-world warm hospitality.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-olive/10 flex items-center justify-center text-staynest-olive">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">Concurrency-Safe Booking Holds</h3>
              <p className="text-xs text-staynest-muted leading-relaxed">When you initiate a reservation, our PostgreSQL interactive transaction locks the room inventory hold for 15 minutes, preventing double-booking even under peak demand.</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-terracotta/10 flex items-center justify-center text-staynest-terracotta">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">Transparent Server Quotes</h3>
              <p className="text-xs text-staynest-muted leading-relaxed">Every rupee is calculated on the server with snapshotted night rates and transparent platform fees. The checkout amount is verified against provider signatures.</p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-olive/10 flex items-center justify-center text-staynest-olive">
                <Castle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">Direct Host Communication</h3>
              <p className="text-xs text-staynest-muted leading-relaxed">Hosts manage room pools and reservations directly with dedicated portal tools, ensuring genuine care from check-in to check-out.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-staynest-charcoal text-white p-8 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-staynest-terracotta">Earn as a Host</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Open your doors to thoughtful travelers.</h2>
            <p className="text-sm text-[#A6A095] leading-relaxed">List your boutique hotel, alpine lounge, or family guest house. Manage your inventory, configure room rates, and receive verified guest bookings.</p>
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
