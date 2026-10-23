import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { PropertyCard, PropertyCardData } from '../components/property/PropertyCard';
import { Search, Filter, RefreshCw, MapPin, Calendar, Users, SlidersHorizontal } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const city = searchParams.get('city') || '';
  const type = searchParams.get('type') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '1';
  const page = searchParams.get('page') || '1';

  const [inputCity, setInputCity] = useState(city);
  const [inputType, setInputType] = useState(type);
  const [inputCheckIn, setInputCheckIn] = useState(checkIn);
  const [inputCheckOut, setInputCheckOut] = useState(checkOut);
  const [inputGuests, setInputGuests] = useState(guests);

  const queryParams = new URLSearchParams();
  if (city) queryParams.set('city', city);
  if (type) queryParams.set('type', type);
  if (checkIn) queryParams.set('checkIn', checkIn);
  if (checkOut) queryParams.set('checkOut', checkOut);
  if (guests) queryParams.set('guests', guests);
  queryParams.set('page', page);
  queryParams.set('limit', '12');

  const { data, isLoading, isFetching, refetch } = useQuery<{
    properties: PropertyCardData[];
    pagination: { total: number; page: number; totalPages: number };
  }>({
    queryKey: ['explore-properties', city, type, checkIn, checkOut, guests, page],
    queryFn: () =>
      apiFetch<{
        properties: PropertyCardData[];
        pagination: { total: number; page: number; totalPages: number };
      }>(`/properties?${queryParams.toString()}`),
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams();
    if (inputCity.trim()) nextParams.set('city', inputCity.trim());
    if (inputType) nextParams.set('type', inputType);
    if (inputCheckIn) nextParams.set('checkIn', inputCheckIn);
    if (inputCheckOut) nextParams.set('checkOut', inputCheckOut);
    if (inputGuests !== '1') nextParams.set('guests', inputGuests);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setInputCity('');
    setInputType('');
    setInputCheckIn('');
    setInputCheckOut('');
    setInputGuests('1');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header and Filter Panel */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6E1D8] shadow-subtle space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-5">
          <div>
            <h1 className="font-serif text-3xl font-bold text-staynest-charcoal">
              Explore Accommodations
            </h1>
            <p className="text-xs text-staynest-muted mt-1">
              {data?.pagination.total !== undefined
                ? `Showing ${data.properties.length} of ${data.pagination.total} active verified stays`
                : 'Search verified stays across regions'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearFilters}
              type="button"
              className="text-xs font-semibold text-staynest-muted hover:text-staynest-charcoal px-3 py-1.5 rounded-full border border-[#E6E1D8] hover:bg-[#FAFAF7]"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter inputs */}
        <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Destination */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Destination City
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-staynest-terracotta" />
              <input
                type="text"
                placeholder="City name..."
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none focus:border-staynest-terracotta"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Property Type
            </label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="HOTEL">Boutique Hotel</option>
              <option value="LOUNGE">Alpine Lounge</option>
              <option value="GUEST_HOUSE">Heritage Guest House</option>
            </select>
          </div>

          {/* Check In */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Check-In Date
            </label>
            <input
              type="date"
              value={inputCheckIn}
              onChange={(e) => setInputCheckIn(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Check Out */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted mb-1">
              Check-Out Date
            </label>
            <input
              type="date"
              min={inputCheckIn}
              value={inputCheckOut}
              onChange={(e) => setInputCheckOut(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Apply button */}
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

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-[#E6E1D8]" />
          ))}
        </div>
      ) : data?.properties && data.properties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E6E1D8] p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-staynest-sand flex items-center justify-center mx-auto text-staynest-muted">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-staynest-charcoal">
            No accommodations match your search
          </h3>
          <p className="text-xs text-staynest-muted leading-relaxed">
            Try adjusting your dates, lowering guest count, or clearing filters to see all available properties.
          </p>
          <button
            onClick={clearFilters}
            className="px-5 py-2 rounded-full bg-staynest-terracotta text-white font-semibold text-xs hover:bg-staynest-terracotta-dark"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-6">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
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
