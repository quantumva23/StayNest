import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch, formatCurrency, messageForError } from '../lib/api';
import { ResponsiveImage } from '../components/common/ResponsiveImage';
import { useAuth } from '../features/auth/AuthContext';
import {
  MapPin,
  Users,
  Shield,
  Wifi,
  Coffee,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Home,
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description?: string;
  roomType?: string;
  capacity: number;
  pricePerNight: number;
  currency: string;
  totalUnits: number;
  images?: Array<{ id: string; imageUrl: string }>;
}

interface PropertyDetail {
  id: string;
  name: string;
  description: string;
  type: 'HOTEL' | 'LOUNGE' | 'GUEST_HOUSE';
  address: string;
  city: string;
  state?: string;
  country: string;
  status: string;
  images: Array<{ id: string; imageUrl: string; altText?: string }>;
  rooms: Room[];
  amenities: Array<{ id: string; name: string; iconKey?: string }>;
  host: { id: string; name: string };
}

interface QuoteResponse {
  quote: {
    roomId: string;
    roomName: string;
    propertyName: string;
    nights: number;
    quantity: number;
    guestsCount: number;
    unitPriceSnapshot: number;
    subtotal: number;
    fees: number;
    totalAmount: number;
    currency: string;
    isAvailable: boolean;
    availableUnits: number;
  };
}

export const PropertyDetailPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Booking widget state
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [checkIn, setCheckIn] = useState<string>(today);
  const [checkOut, setCheckOut] = useState<string>(tomorrow);
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [quantity, setQuantity] = useState<number>(1);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ property: PropertyDetail }>({
    queryKey: ['property', propertyId],
    queryFn: () => apiFetch<{ property: PropertyDetail }>(`/properties/${propertyId}`),
  });

  const property = data?.property;

  // Auto-select first room
  React.useEffect(() => {
    if (property && property.rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(property.rooms[0].id);
    }
  }, [property, selectedRoomId]);

  // Server quote query
  const canQuote = Boolean(selectedRoomId && checkIn && checkOut && checkOut > checkIn);
  const {
    data: quoteData,
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useQuery<QuoteResponse>({
    queryKey: ['booking-quote', selectedRoomId, checkIn, checkOut, quantity, guestsCount],
    queryFn: () =>
      apiFetch<QuoteResponse>('/bookings/quote', {
        method: 'POST',
        body: JSON.stringify({
          roomId: selectedRoomId,
          checkIn,
          checkOut,
          quantity,
          guestsCount,
        }),
      }),
    enabled: canQuote && data?.property.status === 'ACTIVE',
  });

  // Booking hold mutation
  const createHoldMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ booking: { id: string } }>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: selectedRoomId,
          checkIn,
          checkOut,
          quantity,
          guestsCount,
        }),
      }),
    onSuccess: (res) => {
      navigate(`/checkout/${res.booking.id}`);
    },
    onError: (err: unknown) => {
      setBookingError(messageForError(err));
    },
  });

  const handleReserve = () => {
    setBookingError(null);
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    createHoldMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-1/3" />
        <div className="h-96 bg-gray-200 rounded-3xl w-full" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-[#E6E1D8] text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-staynest-terracotta mx-auto" />
        <h2 className="font-serif text-2xl font-bold">Property not found</h2>
        <p className="text-xs text-staynest-muted">{messageForError(error)}</p>
        <button
          onClick={() => navigate('/explore')}
          className="px-5 py-2.5 rounded-full bg-staynest-charcoal text-white text-xs font-semibold"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const selectedRoom = property.rooms.find((r) => r.id === selectedRoomId);
  const quote = quoteData?.quote;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Property Title & Location */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-staynest-sand text-staynest-olive">
            {property.type.replace('_', ' ')}
          </span>
          <span className="text-xs text-staynest-muted">•</span>
          <div className="flex items-center text-xs text-staynest-muted space-x-1">
            <MapPin className="w-3.5 h-3.5 text-staynest-terracotta" />
            <span>{property.address}, {property.city}, {property.country}</span>
          </div>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-staynest-charcoal">
          {property.name}
        </h1>
        {property.status !== 'ACTIVE' && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            This stay is {property.status.replace(/_/g, ' ').toLowerCase()} and does not appear in search until an admin approves it.
          </p>
        )}
      </div>

      {/* Image Gallery with Responsive Cover and Fallback */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-3xl overflow-hidden border border-[#E6E1D8] bg-[#F2ECE4] shadow-subtle">
        {property.images.length > 0 ? (
          <>
            <div className="md:col-span-3 aspect-[16/10] overflow-hidden">
              <ResponsiveImage
                src={property.images[0]?.imageUrl}
                alt={property.images[0]?.altText || property.name}
                aspectRatioClass="aspect-[16/10]"
                objectFit="cover"
                objectPosition="object-center"
                className="hover:scale-102 transition-transform duration-500"
              />
            </div>
            <div className="hidden md:flex flex-col gap-4">
              {property.images.slice(1, 3).map((img) => (
                <div key={img.id} className="h-full aspect-[4/3] overflow-hidden">
                  <ResponsiveImage
                    src={img.imageUrl}
                    alt={img.altText || property.name}
                    aspectRatioClass="aspect-[4/3]"
                    objectFit="cover"
                    objectPosition="object-center"
                    className="hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
              {property.images.length < 2 && (
                <div className="h-full bg-staynest-sand flex items-center justify-center text-staynest-muted text-xs">
                  Authentic Stay
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="col-span-4 h-80 bg-gray-200 flex items-center justify-center text-gray-500">
            No images available
          </div>
        )}
      </div>

      {/* Main Grid: Details (Left) + Booking Hold Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Description, Amenities, Rooms */}
        <div className="lg:col-span-7 space-y-10">
          {/* Host info card */}
          <div className="flex items-center space-x-4 p-5 rounded-2xl bg-white border border-[#E6E1D8]">
            <div className="w-12 h-12 rounded-full bg-staynest-sand flex items-center justify-center text-staynest-olive font-bold text-lg">
              {property.host.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-staynest-muted">Hosted by</p>
              <h3 className="text-sm font-bold text-staynest-charcoal">{property.host.name}</h3>
              <p className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified StayNest Host</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">
              About this stay
            </h2>
            <p className="text-sm text-staynest-charcoal/80 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities */}
          <div className="space-y-4 pt-4 border-t border-[#E6E1D8]">
            <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">
              Included Amenities
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="flex items-center space-x-2.5 p-3 rounded-xl bg-white border border-[#E6E1D8] text-xs font-semibold text-staynest-charcoal"
                >
                  <CheckCircle2 className="w-4 h-4 text-staynest-olive shrink-0" />
                  <span>{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Room options */}
          <div className="space-y-4 pt-4 border-t border-[#E6E1D8]">
            <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">
              Room Categories & Inventory
            </h2>
            <div className="space-y-3">
              {property.rooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-staynest-terracotta bg-[#FFF8F6] ring-1 ring-staynest-terracotta'
                        : 'border-[#E6E1D8] bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {room.images && room.images.length > 0 && (
                        <div className="w-full sm:w-32 aspect-[4/3] rounded-xl overflow-hidden shrink-0 bg-[#F2ECE4]">
                          <ResponsiveImage
                            src={room.images[0]?.imageUrl}
                            alt={`${room.name} room`}
                            aspectRatioClass="aspect-[4/3]"
                            objectFit="cover"
                            objectPosition="object-center"
                          />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-staynest-charcoal">{room.name}</h4>
                            {room.roomType && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-staynest-charcoal text-white font-medium uppercase tracking-wide">
                                {room.roomType.replace('_', ' ')}
                              </span>
                            )}
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-staynest-sand text-staynest-olive font-medium">
                              Up to {room.capacity} guests
                            </span>
                          </div>
                          {room.description && (
                            <p className="text-xs text-staynest-muted mt-1 leading-normal">{room.description}</p>
                          )}
                          <p className="text-[11px] text-staynest-muted mt-2">
                            Pool Inventory: {room.totalUnits} available room{room.totalUnits > 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-base font-bold text-staynest-charcoal">
                            {formatCurrency(room.pricePerNight, room.currency)}
                          </span>
                          <span className="text-xs text-staynest-muted block">/ night</span>
                          <span
                            className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
                              isSelected
                                ? 'bg-staynest-terracotta text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Server Quote & Reserve Widget */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 bg-white rounded-3xl p-6 border border-[#E6E1D8] shadow-hover space-y-6">
            <div className="flex items-baseline justify-between border-b border-[#F0EBE1] pb-4">
              <div>
                <span className="text-2xl font-bold font-serif text-staynest-charcoal">
                  {selectedRoom ? formatCurrency(selectedRoom.pricePerNight, selectedRoom.currency) : '—'}
                </span>
                <span className="text-xs text-staynest-muted"> / night</span>
              </div>
              <span className="text-xs text-staynest-olive font-semibold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>15-min hold</span>
              </span>
            </div>

            {/* Inputs: Dates, Guests, Quantity */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-staynest-muted">
                    Check-In
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut && e.target.value >= checkOut) {
                        setCheckOut('');
                      }
                    }}
                    className="w-full text-xs font-bold text-staynest-charcoal bg-transparent mt-0.5 focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-staynest-muted">
                    Check-Out
                  </label>
                  <input
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-xs font-bold text-staynest-charcoal bg-transparent mt-0.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-staynest-muted">
                    Guests
                  </label>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="w-full text-xs font-bold text-staynest-charcoal bg-transparent mt-0.5 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-staynest-muted">
                    Rooms
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full text-xs font-bold text-staynest-charcoal bg-transparent mt-0.5 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'room' : 'rooms'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Live Pricing Breakdown from Server Quote */}
            {isQuoteLoading ? (
              <div className="py-4 text-center text-xs text-staynest-muted animate-pulse">
                Calculating exact server rates & checking live inventory...
              </div>
            ) : quoteError ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {messageForError(quoteError)}
              </div>
            ) : quote ? (
              <div className="space-y-2.5 pt-2 border-t border-[#F0EBE1] text-xs">
                <div className="flex justify-between text-staynest-muted">
                  <span>
                    {formatCurrency(quote.unitPriceSnapshot, quote.currency)} × {quote.nights} night
                    {quote.nights > 1 ? 's' : ''} ({quote.quantity} room)
                  </span>
                  <span className="font-medium text-staynest-charcoal">
                    {formatCurrency(quote.subtotal, quote.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-staynest-muted">
                  <span>StayNest Service Fee (10%)</span>
                  <span className="font-medium text-staynest-charcoal">
                    {formatCurrency(quote.fees, quote.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-[#F0EBE1] text-sm font-bold text-staynest-charcoal">
                  <span>Total Amount</span>
                  <span className="text-xl text-staynest-terracotta">
                    {formatCurrency(quote.totalAmount, quote.currency)}
                  </span>
                </div>

                {!quote.isAvailable && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                    The selected room category is not available for these dates. Remaining units: {quote.availableUnits}.
                  </div>
                )}
              </div>
            ) : null}

            {bookingError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {bookingError}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleReserve}
              disabled={property.status !== 'ACTIVE' || createHoldMutation.isPending || (quote && !quote.isAvailable)}
              className="w-full py-4 rounded-2xl bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {createHoldMutation.isPending ? (
                <span>Securing hold in database...</span>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Reserve & Hold for 15 Mins</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-staynest-muted leading-relaxed">
              You won't be charged yet. We lock this room category exclusively for your account for 15 minutes while you review payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
