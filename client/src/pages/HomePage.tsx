import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch, messageForError, resolveImageUrl } from '../lib/api';
import { SearchBar } from '../components/search/SearchBar';
import { PropertyCard, PropertyCardData } from '../components/property/PropertyCard';
import { ResponsiveImage } from '../components/common/ResponsiveImage';
import { useAuth } from '../features/auth/AuthContext';
import {
  ShieldCheck,
  Compass,
  Bed,
  Mountain,
  Castle,
  ArrowRight,
  Home,
  Users,
  Crown,
  HeartHandshake,
  MapPin,
} from 'lucide-react';

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
  DELUXE: Crown,
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

interface FeaturedDestination {
  name: string;
  slug: string;
  state: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}

const FEATURED_DESTINATIONS: FeaturedDestination[] = [
  {
    name: 'Varanasi',
    slug: 'varanasi',
    state: 'Uttar Pradesh',
    subtitle: 'Timeless Riverfront Rituals & Ancient Lanes',
    description:
      'Witness sacred twilight Ganga Aarti rituals, navigate centuries-old stone lanes filled with spiritual heritage, and relax in peaceful riverside havelis.',
    imageUrl: resolveImageUrl('/uploads/properties/Sunset%20Aarti%20on%20the%20Sacred%20Ghat.png'),
    imageAlt: 'Evening Ganga Aarti on the sacred riverfront ghat in Varanasi',
  },
  {
    name: 'Manali',
    slug: 'manali',
    state: 'Himachal Pradesh',
    subtitle: 'Himalayan Views & Mountain Retreats',
    description:
      'Wake to crisp alpine breezes, snow-crested Himalayan ridges, and whispering pine forests in cosy wooden chalets and serene valley stays.',
    imageUrl: resolveImageUrl('/uploads/properties/dominik-neuner-IcN_5_He218-unsplash.jpg'),
    imageAlt: 'Scenic Himalayan mountains and deodar pine forests in Manali',
  },
  {
    name: 'Goa',
    slug: 'goa',
    state: 'Goa',
    subtitle: 'Coastal Escapes & Heritage Guest Houses',
    description:
      'Unwind along sun-dappled shores, explore tranquil Portuguese-era coastal estates, and savor leisurely evenings with Arabian Sea breezes.',
    imageUrl: resolveImageUrl('/uploads/properties/pexels-bertellifotografia-12513478.jpg'),
    imageAlt: 'Palm-fringed golden coastal beach escape in Goa',
  },
  {
    name: 'Nainital',
    slug: 'nainital',
    state: 'Uttarakhand',
    subtitle: 'Emerald Lake Views & Misty Hillside Walks',
    description:
      'Stroll along tranquil lakeside promenades, take in sweeping vistas of the Kumaon hills, and relax in quiet mountain lodges enveloped in mountain mist.',
    imageUrl: resolveImageUrl('/uploads/properties/dominik-neuner-ZI3HqTw-Ua4-unsplash.jpg'),
    imageAlt: 'Tranquil emerald mountain lake and forested hills of Nainital',
  },
];

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

  const tripsQuery = useQuery<{
    bookings: Array<{
      id: string;
      status: string;
      checkIn: string;
      room: { name: string; roomType?: string; property: { name: string; city: string } };
    }>;
  }>({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch('/bookings/me'),
    enabled: user?.role === 'GUEST',
  });

  const availableDestinations = (catalogQuery.data?.cities || []).filter((city) => city.count > 0);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-staynest-olive-light/60 border border-staynest-olive/20 text-staynest-olive text-xs font-semibold uppercase tracking-wider mb-6">
          <Compass className="w-3.5 h-3.5 text-staynest-terracotta" />
          <span>Curated Boutique Accommodations Across India</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-staynest-charcoal max-w-4xl mx-auto leading-[1.1]">
          Discover places with soul.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-staynest-muted max-w-2xl mx-auto leading-relaxed">
          From tranquil lakeside havelis and alpine forest retreats to sun-drenched coastal villas.
          Thoughtfully curated stays across India with clear, upfront pricing.
        </p>

        <div className="mt-10">
          <SearchBar />
        </div>
      </section>

      {/* Guest Active Trips */}
      {user?.role === 'GUEST' && tripsQuery.data && tripsQuery.data.bookings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">Your trips</h2>
            <Link to="/account/bookings" className="text-xs font-semibold text-staynest-terracotta">
              View all
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {tripsQuery.data.bookings.slice(0, 4).map((booking) => (
              <Link
                key={booking.id}
                to="/account/bookings"
                className="min-w-[240px] bg-white border border-[#E6E1D8] rounded-3xl p-4 hover:-translate-y-1 transition-transform"
              >
                <p className="text-[11px] uppercase font-bold text-staynest-olive">
                  {booking.status.replace('_', ' ')}
                </p>
                <p className="font-serif text-lg font-bold text-staynest-charcoal mt-1">
                  {booking.room.property.name}
                </p>
                <p className="text-xs text-staynest-muted">
                  {booking.room.property.city} · {booking.room.name}
                </p>
                <p className="text-xs text-staynest-muted mt-2">
                  {new Date(booking.checkIn).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Four Location-Focused Destination Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-staynest-terracotta">
              Iconic Getaways
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal mt-1">
              Explore By Destination
            </h2>
          </div>
          <p className="text-sm text-staynest-muted max-w-md">
            Handpicked escapes capturing the architectural beauty, natural landscapes, and cultural
            heritage of India.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_DESTINATIONS.map((destination) => (
            <div
              key={destination.slug}
              className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-[#E6E1D8] transition-all duration-300 hover:shadow-hover hover:-translate-y-1.5 h-full"
            >
              <div className="relative w-full h-52 sm:h-56 overflow-hidden bg-[#F2ECE4] shrink-0">
                <ResponsiveImage
                  src={destination.imageUrl}
                  alt={destination.imageAlt}
                  containerClassName="w-full h-full"
                  aspectRatioClass="w-full h-full"
                  objectFit="cover"
                  objectPosition="object-center"
                  className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3.5 left-3.5 z-20">
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-staynest-charcoal border border-white/40 shadow-sm">
                    <MapPin className="w-3 h-3 text-staynest-terracotta" />
                    <span>{destination.state}</span>
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-staynest-charcoal group-hover:text-staynest-terracotta transition-colors">
                    {destination.name}
                  </h3>
                  <p className="text-xs font-semibold text-staynest-olive mt-0.5">
                    {destination.subtitle}
                  </p>
                  <p className="text-xs text-staynest-muted mt-2.5 line-clamp-3 leading-relaxed">
                    {destination.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F2EFE9]">
                  <Link
                    to={`/explore?city=${destination.slug}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-staynest-terracotta hover:text-staynest-terracotta-dark transition-colors group/link"
                  >
                    <span>Explore stays in {destination.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Handpicked Featured Stays */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-staynest-olive">
              Curated Accommodations
            </span>
            <h2 className="font-serif text-3xl font-bold text-staynest-charcoal mt-1">
              Handpicked Featured Stays
            </h2>
            <p className="text-sm text-staynest-muted mt-1">
              Filter by stay style or room architecture.
            </p>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => {
                setPropertyType('');
                setRoomType('');
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                !propertyType
                  ? 'bg-staynest-charcoal text-white border-staynest-charcoal'
                  : 'bg-white text-staynest-charcoal border-[#E6E1D8] hover:bg-[#FAFAF7]'
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                    isActive
                      ? 'bg-staynest-charcoal text-white border-staynest-charcoal'
                      : 'bg-white text-staynest-charcoal border-[#E6E1D8] hover:bg-[#FAFAF7]'
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
                className={`min-w-[140px] text-left p-4 rounded-3xl border transition-all hover:-translate-y-1 ${
                  isActive
                    ? 'bg-staynest-charcoal text-white border-staynest-charcoal'
                    : 'bg-white text-staynest-charcoal border-[#E6E1D8] hover:bg-[#FAFAF7]'
                }`}
              >
                <Icon className="w-4 h-4 mb-3" />
                <p className="font-serif text-lg font-bold">{room.label}</p>
                <p
                  className={`text-[11px] mt-1 ${
                    isActive ? 'text-white/70' : 'text-staynest-muted'
                  }`}
                >
                  {room.count} stays
                </p>
              </button>
            );
          })}
        </div>

        {listingsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl h-80 animate-pulse border border-[#E6E1D8]"
              />
            ))}
          </div>
        ) : listingsQuery.error ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#E6E1D8] p-8 space-y-3">
            <p className="text-staynest-charcoal text-sm">
              {messageForError(listingsQuery.error)}
            </p>
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
            <p className="text-staynest-muted text-sm">
              No stays are published in this category yet.
            </p>
            <button
              onClick={() => {
                setPropertyType('');
                setRoomType('');
              }}
              className="px-4 py-2 rounded-full border border-[#E6E1D8] text-xs font-semibold hover:bg-gray-50"
            >
              Clear filters
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

      {/* Additional Active Cities Pills */}
      {availableDestinations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-staynest-charcoal mb-4">
            More Popular Destinations
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {availableDestinations.map((city) => (
              <Link
                key={city.id}
                to={`/explore?city=${city.slug}`}
                className="bg-white border border-[#E6E1D8] rounded-2xl p-4 hover:border-staynest-terracotta/40 hover:-translate-y-0.5 transition-all text-center group"
              >
                <p className="font-serif text-base font-bold text-staynest-charcoal group-hover:text-staynest-terracotta transition-colors">
                  {city.name}
                </p>
                <p className="text-[11px] text-staynest-muted mt-0.5">{city.count} stays</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Replaced Technical Section with Hospitality Discovery Section */}
      <section className="bg-white border-y border-[#E6E1D8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-staynest-olive">
              The StayNest Standard
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal mt-1">
              Crafted for confidence & delight
            </h2>
            <p className="text-sm text-staynest-muted mt-2">
              StayNest combines heartfelt Indian hospitality with modern, effortless booking.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-olive/10 flex items-center justify-center text-staynest-olive">
                <Castle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                Architectural Character & Soul
              </h3>
              <p className="text-xs text-staynest-muted leading-relaxed">
                Every haveli, boutique villa, and mountain chalet is selected for genuine local
                craftsmanship, cultural charm, and scenic surroundings.
              </p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-terracotta/10 flex items-center justify-center text-staynest-terracotta">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                Clear, Upfront Pricing
              </h3>
              <p className="text-xs text-staynest-muted leading-relaxed">
                All accommodation rates are clearly displayed in Indian Rupees (₹) with transparent
                breakdowns. No unexpected hidden fees at checkout.
              </p>
            </div>
            <div className="p-6 rounded-3xl bg-[#FAFAF7] border border-[#E6E1D8] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-staynest-olive/10 flex items-center justify-center text-staynest-olive">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                Thoughtful Host Care
              </h3>
              <p className="text-xs text-staynest-muted leading-relaxed">
                Connect with welcoming local hosts who ensure your journey is seamless, from arrival
                guidance to insider recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Host Invitation Banner */}
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
              List your boutique hotel, alpine retreat, or family guest house. Manage your inventory,
              set your nightly rates, and welcome travelers from across India and the world.
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
