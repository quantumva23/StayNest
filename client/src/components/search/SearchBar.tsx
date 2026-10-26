import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Calendar, Users, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface CityOption {
  id: string;
  name: string;
  slug: string;
  state?: string | null;
  country?: string | null;
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
  const [dateValidationMessage, setDateValidationMessage] = useState<string>('');

  const destinationContainerRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const checkInInputRef = useRef<HTMLInputElement>(null);
  const checkOutInputRef = useRef<HTMLInputElement>(null);

  // Sync state with incoming initial props
  useEffect(() => {
    setCity(initialCity);
  }, [initialCity]);

  useEffect(() => {
    setCheckIn(initialCheckIn);
  }, [initialCheckIn]);

  useEffect(() => {
    setCheckOut(initialCheckOut);
  }, [initialCheckOut]);

  useEffect(() => {
    setGuests(initialGuests);
  }, [initialGuests]);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  // Close destination suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        destinationContainerRef.current &&
        !destinationContainerRef.current.contains(event.target as Node)
      ) {
        setOpenSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data } = useQuery<{ cities: CityOption[] }>({
    queryKey: ['cities'],
    queryFn: () => apiFetch<{ cities: CityOption[] }>('/cities'),
  });

  const suggestions = useMemo(() => {
    const cities = (data?.cities || []).filter((item) => item.slug !== 'demo-destination');
    const term = city.trim().toLowerCase();
    if (!term) return cities.slice(0, 8);

    const matches = cities.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        (item.state && item.state.toLowerCase().includes(term))
    );

    // If there is only one match that equals current input, show other popular cities too
    if (matches.length === 1 && matches[0].name.toLowerCase() === term) {
      const others = cities.filter((item) => item.id !== matches[0].id).slice(0, 5);
      return [...matches, ...others];
    }

    return matches.slice(0, 8);
  }, [city, data]);

  const today = new Date().toISOString().split('T')[0];

  // Calculate minimum checkout date based on checkIn
  const minCheckOutDate = useMemo(() => {
    if (!checkIn) return today;
    const date = new Date(checkIn);
    date.setDate(date.getDate() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [checkIn, today]);

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    setDateValidationMessage('');
    // If checkOut is set and becomes invalid (same day or before check-in), clear it
    if (checkOut && newCheckIn && checkOut <= newCheckIn) {
      setCheckOut('');
    }
  };

  const handleCheckOutChange = (newCheckOut: string) => {
    if (checkIn && newCheckOut && newCheckOut <= checkIn) {
      setDateValidationMessage('Check-out must be at least one day after check-in.');
      setCheckOut('');
      return;
    }
    setDateValidationMessage('');
    setCheckOut(newCheckOut);
  };

  const triggerDatePicker = (ref: React.RefObject<HTMLInputElement>) => {
    if (!ref.current) return;
    try {
      ref.current.showPicker();
    } catch {
      ref.current.focus();
    }
  };

  const handleOpenGoogleMaps = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const destinationQuery = city.trim()
      ? `${city.trim()}, India boutique stays`
      : 'Boutique hotels and heritage stays in India';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      destinationQuery
    )}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (checkIn && checkOut && checkOut <= checkIn) {
      setDateValidationMessage('Check-out must be after check-in.');
      return;
    }

    const params = new URLSearchParams();
    const term = city.trim().toLowerCase();
    const match = data?.cities.find(
      (item) =>
        item.slug !== 'demo-destination' &&
        (item.name.toLowerCase() === term ||
          item.slug.toLowerCase() === term ||
          (item.state && item.state.toLowerCase() === term))
    );

    if (match) {
      params.set('city', match.slug);
    } else if (city.trim()) {
      params.set('city', city.trim());
    }

    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    if (type) params.set('type', type);

    setOpenSuggestions(false);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <div className="relative">
      <form
        onSubmit={handleSearch}
        className={`bg-white rounded-3xl border border-[#E6E1D8] shadow-hover p-3 md:p-3.5 transition-all ${
          compact ? 'max-w-4xl mx-auto' : 'max-w-5xl mx-auto'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
          {/* Destination Field */}
          <div
            ref={destinationContainerRef}
            className="md:col-span-3 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8] relative"
          >
            <div>
              <label
                htmlFor="destination-search-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted cursor-pointer"
              >
                Destination
              </label>
            </div>

            <div className="flex items-center space-x-1 mt-0.5">
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                title={
                  city.trim()
                    ? `Explore ${city.trim()} on Google Maps`
                    : 'Explore destinations on Google Maps'
                }
                aria-label="Explore destination on Google Maps"
                className="p-1 -ml-1 rounded-full text-staynest-terracotta hover:text-staynest-terracotta-dark hover:bg-staynest-sand/60 transition-all shrink-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-staynest-terracotta/40"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <input
                id="destination-search-input"
                ref={destinationInputRef}
                type="text"
                autoComplete="off"
                placeholder="Varanasi, Manali, Goa..."
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setOpenSuggestions(true);
                }}
                onFocus={() => setOpenSuggestions(true)}
                className="w-full text-sm font-semibold text-staynest-charcoal bg-transparent placeholder-gray-400 focus:outline-none"
              />
              {city && (
                <button
                  type="button"
                  onClick={() => {
                    setCity('');
                    setOpenSuggestions(true);
                    destinationInputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-staynest-muted hover:text-staynest-charcoal hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Clear destination"
                  title="Clear destination"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Popover */}
            {openSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-2 bg-white border border-[#E6E1D8] rounded-2xl shadow-xl overflow-hidden text-left divide-y divide-[#F2EFE9] max-h-64 overflow-y-auto">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent premature blur
                        e.preventDefault();
                        setCity(item.name);
                        setOpenSuggestions(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-staynest-charcoal hover:bg-[#FAFAF7] hover:text-staynest-terracotta text-left flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-staynest-muted" />
                        <span>{item.name}</span>
                        {item.state ? (
                          <span className="text-staynest-muted font-normal text-[11px]">
                            , {item.state}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-staynest-olive tracking-wide">
                        Select
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stay Type */}
          <div className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8]">
            <label
              htmlFor="stay-type-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted cursor-pointer"
            >
              Stay type
            </label>
            <select
              id="stay-type-select"
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

          {/* Check-In */}
          <div
            onClick={() => triggerDatePicker(checkInInputRef)}
            className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8] cursor-pointer"
          >
            <label
              htmlFor="checkin-date-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted cursor-pointer"
            >
              Check-In
            </label>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerDatePicker(checkInInputRef);
                }}
                className="p-0.5 rounded text-staynest-olive hover:text-staynest-charcoal transition-colors shrink-0"
                aria-label="Open check-in calendar"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <input
                id="checkin-date-input"
                ref={checkInInputRef}
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => handleCheckInChange(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {
                    // Fallback to browser default
                  }
                }}
                className="w-full text-xs font-semibold text-staynest-charcoal bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Check-Out */}
          <div
            onClick={() => triggerDatePicker(checkOutInputRef)}
            className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8] cursor-pointer"
          >
            <label
              htmlFor="checkout-date-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted cursor-pointer"
            >
              Check-Out
            </label>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerDatePicker(checkOutInputRef);
                }}
                className="p-0.5 rounded text-staynest-olive hover:text-staynest-charcoal transition-colors shrink-0"
                aria-label="Open check-out calendar"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <input
                id="checkout-date-input"
                ref={checkOutInputRef}
                type="date"
                min={minCheckOutDate}
                value={checkOut}
                onChange={(e) => handleCheckOutChange(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {
                    // Fallback to browser default
                  }
                }}
                className="w-full text-xs font-semibold text-staynest-charcoal bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Guests */}
          <div className="md:col-span-2 px-3 py-1.5 rounded-2xl hover:bg-[#FAFAF7] transition-colors border border-transparent hover:border-[#E6E1D8]">
            <label
              htmlFor="guests-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-staynest-muted cursor-pointer"
            >
              Guests
            </label>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <Users className="w-4 h-4 text-staynest-muted shrink-0" />
              <select
                id="guests-select"
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

          {/* Search Button */}
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

      {/* Date validation alert message if user selects conflicting dates */}
      {dateValidationMessage && (
        <div className="max-w-5xl mx-auto mt-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{dateValidationMessage}</span>
        </div>
      )}
    </div>
  );
};

