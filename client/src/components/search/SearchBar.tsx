import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface CityOption {
  id: string;
  name: string;
  slug: string;
  state?: string | null;
}

interface SearchBarProps {
  initialCity?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialType?: string;
  compact?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialCity = '',
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 1,
  initialType = '',
  compact = false,
}) => {
  const navigate = useNavigate();
  const [city, setCity] = useState(initialCity);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [type, setType] = useState(initialType);
  const [openSuggestions, setOpenSuggestions] = useState(false);

  const { data } = useQuery<{ cities: CityOption[] }>({
    queryKey: ['cities'],
    queryFn: () => apiFetch<{ cities: CityOption[] }>('/cities'),
  });

  const suggestions = useMemo(() => {
    const cities = data?.cities || [];
    const term = city.trim().toLowerCase();
    if (!term) return cities.slice(0, 6);
    return cities
      .filter((item) => item.name.toLowerCase().includes(term) || item.slug.includes(term))
      .slice(0, 6);
  }, [city, data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const match = data?.cities.find(
      (item) => item.name.toLowerCase() === city.trim().toLowerCase() || item.slug === city.trim().toLowerCase()
    );
    if (match) params.set('city', match.slug);
    else if (city.trim()) params.set('city', city.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    if (type) params.set('type', type);
    setOpenSuggestions(false);
    navigate(`/explore?${params.toString()}`);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form
      onSubmit={handleSearch}
      className={`bg-white rounded-3xl border border-[#E6E1D8] shadow-hover p-3 md:p-3.5 transition-all ${
        compact ? 'max-w-4xl mx-auto' : 'max-w-5xl mx-auto'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
        <div className="md:col-span-3 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8] relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
            Destination
          </label>
          <div className="flex items-center space-x-2 mt-0.5">
            <MapPin className="w-4 h-4 text-staynest-terracotta shrink-0" />
            <input
              type="text"
              placeholder="Udaipur, Manali, Goa"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setOpenSuggestions(true);
              }}
              onFocus={() => setOpenSuggestions(true)}
              className="w-full text-sm font-semibold text-staynest-charcoal bg-transparent placeholder-gray-400 focus:outline-none"
            />
          </div>
          {openSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 bg-white border border-[#E6E1D8] rounded-2xl shadow-hover overflow-hidden text-left">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCity(item.name);
                      setOpenSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-staynest-charcoal hover:bg-[#FAFAF7] text-left"
                  >
                    {item.name}
                    {item.state ? <span className="text-staynest-muted font-medium">, {item.state}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8]">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
            Stay type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-xs font-semibold text-staynest-charcoal bg-transparent focus:outline-none cursor-pointer mt-0.5"
          >
            <option value="">All stays</option>
            <option value="HOTEL">Boutique Hotel</option>
            <option value="LOUNGE">Scenic Lounge</option>
            <option value="GUEST_HOUSE">Guest House</option>
          </select>
        </div>

        <div className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8]">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
            Check-In
          </label>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Calendar className="w-4 h-4 text-staynest-olive shrink-0" />
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value >= checkOut) setCheckOut('');
              }}
              className="w-full text-xs font-semibold text-staynest-charcoal bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8]">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
            Check-Out
          </label>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Calendar className="w-4 h-4 text-staynest-olive shrink-0" />
            <input
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full text-xs font-semibold text-staynest-charcoal bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8]">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
            Guests
          </label>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Users className="w-4 h-4 text-staynest-muted shrink-0" />
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full text-xs font-semibold text-staynest-charcoal bg-transparent focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-1 flex justify-end">
          <button
            type="submit"
            className="w-full md:w-12 h-12 rounded-2xl bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95"
            aria-label="Search"
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </form>
  );
};
