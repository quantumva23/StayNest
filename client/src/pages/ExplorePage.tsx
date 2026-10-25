import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, messageForError } from '../lib/api';
import { PropertyCard, PropertyCardData } from '../components/property/PropertyCard';
import { Search, Filter } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
}

interface Catalog {
  propertyTypes: Array<{ id: string; label: string; count: number }>;
  roomTypes: Array<{ id: string; label: string; count: number }>;
  cities: Array<{ id: string; name: string; slug: string }>;
}

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const city = searchParams.get('city') || '';
  const type = searchParams.get('type') || '';
  const roomType = searchParams.get('roomType') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '1';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const amenities = searchParams.get('amenities') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = searchParams.get('page') || '1';

  const [draft, setDraft] = useState({
    city, type, roomType, checkIn, checkOut, guests, minPrice, maxPrice, sort,
  });
  const [draftAmenities, setDraftAmenities] = useState<string[]>(
    amenities ? amenities.split(',').filter(Boolean) : []
  );

  useEffect(() => {
    setDraft({ city, type, roomType, checkIn, checkOut, guests, minPrice, maxPrice, sort });
    setDraftAmenities(amenities ? amenities.split(',').filter(Boolean) : []);
  }, [city, type, roomType, checkIn, checkOut, guests, minPrice, maxPrice, sort, amenities]);

  const catalogQuery = useQuery<Catalog>({
    queryKey: ['catalog'],
    queryFn: () => apiFetch<Catalog>('/properties/catalog'),
  });

  const amenitiesQuery = useQuery<{ amenities: Amenity[] }>({
    queryKey: ['amenities'],
    queryFn: () => apiFetch<{ amenities: Amenity[] }>('/amenities'),
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    if (roomType) params.set('roomType', roomType);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (amenities) params.set('amenities', amenities);
    if (sort) params.set('sort', sort);
    params.set('page', page);
    params.set('limit', '12');
    return params.toString();
  }, [city, type, roomType, checkIn, checkOut, guests, minPrice, maxPrice, amenities, sort, page]);

  const listingsQuery = useQuery<{
    properties: PropertyCardData[];
    pagination: { total: number; page: number; totalPages: number };
  }>({
    queryKey: ['explore-properties', queryString],
    queryFn: () => apiFetch(`/properties?${queryString}`),
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (draft.city.trim()) next.set('city', draft.city.trim());
    if (draft.type) next.set('type', draft.type);
    if (draft.roomType) next.set('roomType', draft.roomType);
    if (draft.checkIn) next.set('checkIn', draft.checkIn);
    if (draft.checkOut) next.set('checkOut', draft.checkOut);
    if (draft.guests && draft.guests !== '1') next.set('guests', draft.guests);
    if (draft.minPrice) next.set('minPrice', draft.minPrice);
    if (draft.maxPrice) next.set('maxPrice', draft.maxPrice);
    if (draftAmenities.length) next.set('amenities', draftAmenities.join(','));
    if (draft.sort && draft.sort !== 'newest') next.set('sort', draft.sort);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setDraft({ city: '', type: '', roomType: '', checkIn: '', checkOut: '', guests: '1', minPrice: '', maxPrice: '', sort: 'newest' });
    setDraftAmenities([]);
    setSearchParams({});
  };

  const activeChips = [
    city && `City: ${city}`,
    type && `Stay: ${type.replace('_', ' ')}`,
    roomType && `Room: ${roomType}`,
    checkIn && checkOut && `${checkIn} → ${checkOut}`,
    guests !== '1' && `${guests} guests`,
    minPrice && `From ₹${minPrice}`,
    maxPrice && `Up to ₹${maxPrice}`,
    amenities && amenities,
    sort !== 'newest' && (sort === 'price_asc' ? 'Price: low to high' : 'Price: high to low'),
  ].filter(Boolean) as string[];

  const fieldClass = 'w-full text-xs font-medium px-3 py-2.5 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white rounded-3xl p-6 border border-[#E6E1D8] shadow-subtle space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-5">
          <div>
            <h1 className="font-serif text-3xl font-bold text-staynest-charcoal">Explore Accommodations</h1>
            <p className="text-xs text-staynest-muted mt-1">
              {listingsQuery.data?.pagination.total !== undefined
                ? `Showing ${listingsQuery.data.properties.length} of ${listingsQuery.data.pagination.total} stays`
                : 'Search verified stays across regions'}
            </p>
          </div>
          <button
            onClick={clearFilters}
            type="button"
            className="text-xs font-semibold text-staynest-muted hover:text-staynest-charcoal px-3 py-1.5 rounded-full border border-[#E6E1D8] hover:bg-[#FAFAF7]"
          >
            Reset Filters
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <span key={chip} className="text-[11px] font-semibold px-3 py-1 rounded-full bg-staynest-sand text-staynest-charcoal">
                {chip}
              </span>
            ))}
          </div>
        )}

        <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Destination</label>
            <select className={fieldClass} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })}>
              <option value="">All cities</option>
              {(catalogQuery.data?.cities || []).map((item) => (
                <option key={item.id} value={item.slug}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Property type</label>
            <select className={fieldClass} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="">All types</option>
              {(catalogQuery.data?.propertyTypes || []).map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Room type</label>
            <select className={fieldClass} value={draft.roomType} onChange={(e) => setDraft({ ...draft, roomType: e.target.value })}>
              <option value="">All rooms</option>
              {(catalogQuery.data?.roomTypes || []).map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Guests</label>
            <select className={fieldClass} value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: e.target.value })}>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Check-in</label>
            <input type="date" className={fieldClass} value={draft.checkIn} onChange={(e) => setDraft({ ...draft, checkIn: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Check-out</label>
            <input type="date" min={draft.checkIn} className={fieldClass} value={draft.checkOut} onChange={(e) => setDraft({ ...draft, checkOut: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Min price (₹)</label>
            <input type="number" min={0} className={fieldClass} value={draft.minPrice} onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Max price (₹)</label>
            <input type="number" min={0} className={fieldClass} value={draft.maxPrice} onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Sort</label>
            <select className={fieldClass} value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {(amenitiesQuery.data?.amenities || []).map((amenity) => {
                const on = draftAmenities.includes(amenity.name);
                return (
                  <button
                    type="button"
                    key={amenity.id}
                    onClick={() => setDraftAmenities((prev) => on ? prev.filter((name) => name !== amenity.name) : [...prev, amenity.name])}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
                      on ? 'bg-staynest-olive text-white border-staynest-olive' : 'bg-white text-staynest-charcoal border-[#E6E1D8]'
                    }`}
                  >
                    {amenity.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-staynest-charcoal hover:bg-black text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {listingsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-[#E6E1D8]" />
          ))}
        </div>
      ) : listingsQuery.error ? (
        <div className="bg-white rounded-3xl border border-[#E6E1D8] p-12 text-center space-y-4 max-w-lg mx-auto">
          <h3 className="font-serif text-xl font-bold text-staynest-charcoal">Search did not load</h3>
          <p className="text-xs text-staynest-muted">{messageForError(listingsQuery.error)}</p>
          <button
            onClick={() => listingsQuery.refetch()}
            className="px-5 py-2 rounded-full bg-staynest-charcoal text-white font-semibold text-xs"
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
        <div className="bg-white rounded-3xl border border-[#E6E1D8] p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-staynest-sand flex items-center justify-center mx-auto text-staynest-muted">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-staynest-charcoal">No accommodations match your search</h3>
          <p className="text-xs text-staynest-muted leading-relaxed">
            Try different dates, a lower guest count, or clear the filters to see every published stay.
          </p>
          <button
            onClick={clearFilters}
            className="px-5 py-2 rounded-full bg-staynest-terracotta text-white font-semibold text-xs hover:bg-staynest-terracotta-dark"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {listingsQuery.data?.pagination && listingsQuery.data.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-6">
          {Array.from({ length: listingsQuery.data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('page', String(p));
                setSearchParams(nextParams);
              }}
              className={`w-9 h-9 rounded-full text-xs font-semibold border transition-all ${
                Number(page) === p
                  ? 'bg-staynest-charcoal text-white border-staynest-charcoal'
                  : 'bg-white text-staynest-charcoal border-[#E6E1D8] hover:border-staynest-charcoal'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
