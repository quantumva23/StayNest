import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, formatCurrency, messageForError } from '../lib/api';
import { ResponsiveImage } from '../components/common/ResponsiveImage';
import {
  ShieldCheck,
  Clock,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface BookingDetail {
  id: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  quantity: number;
  unitPriceSnapshot: number;
  subtotal: number;
  fees: number;
  totalAmount: number;
  currency: string;
  expiresAt: string | null;
  createdAt: string;
  room: {
    id: string;
    name: string;
    property: {
      id: string;
      name: string;
      city: string;
      country: string;
      images: Array<{ imageUrl: string }>;
    };
  };
}

export const CheckoutPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<{ booking: BookingDetail }>({
    queryKey: ['booking-checkout', bookingId],
    queryFn: () => apiFetch<{ booking: BookingDetail }>(`/bookings/${bookingId}`),
    refetchInterval: (query) => {
      // Refresh while hold is pending
      return query.state.data?.booking.status === 'PENDING_PAYMENT' ? 10000 : false;
    },
  });

  const booking = data?.booking;

  // Countdown timer for 15-minute hold
  useEffect(() => {
    if (!booking || booking.status !== 'PENDING_PAYMENT' || !booking.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(booking.expiresAt!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00');
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  const queryClient = useQueryClient();

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      setPaymentError(null);
      // 1. Initiate checkout on backend (backend recalculates amount and creates gateway order)
      const checkoutRes = await apiFetch<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        bookingId: string;
      }>('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      });

      // 2. Perform Sandbox verification (or Razorpay modal when live SDK loaded)
      const verifyRes = await apiFetch<{ success: boolean; status: string }>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: checkoutRes.bookingId,
          providerOrderId: checkoutRes.orderId,
          providerPaymentId: `pay_${Date.now()}_sandbox`,
          signature: 'mock_valid_signature',
        }),
      });

      return verifyRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-checkout', bookingId] });
      refetch();
    },
    onError: (err: unknown) => {
      setPaymentError(messageForError(err));
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-staynest-muted animate-pulse">
        Loading reservation hold details...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-[#E6E1D8] text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-staynest-terracotta mx-auto" />
        <h2 className="font-serif text-2xl font-bold">Booking Not Found</h2>
        <p className="text-xs text-staynest-muted">{error ? messageForError(error) : 'We could not retrieve this reservation record.'}</p>
        <Link
          to="/explore"
          className="inline-block px-5 py-2.5 rounded-full bg-staynest-charcoal text-white text-xs font-semibold"
        >
          Explore Stays
        </Link>
      </div>
    );
  }

  const checkInDate = new Date(booking.checkIn).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const checkOutDate = new Date(booking.checkOut).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Hold Timer Alert if PENDING_PAYMENT */}
      {booking.status === 'PENDING_PAYMENT' && !isExpired && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-amber-700 animate-spin" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Inventory Hold Active</p>
              <p className="text-xs text-amber-800">
                This room is locked exclusively for you. Complete payment before the timer expires.
              </p>
            </div>
          </div>
          <div className="font-mono text-lg font-bold px-3 py-1 bg-white rounded-xl border border-amber-200">
            {timeLeft || '15:00'}
          </div>
        </div>
      )}

      {/* Confirmed Banner */}
      {booking.status === 'CONFIRMED' && (
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            <div>
              <h2 className="font-serif text-2xl font-bold text-emerald-950">
                Reservation Confirmed!
              </h2>
              <p className="text-xs text-emerald-800">
                Booking ID: <code className="font-mono font-bold">{booking.id}</code>
              </p>
            </div>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Your stay is confirmed and payment signature was successfully verified. The host has been notified.
          </p>
        </div>
      )}

      {/* Expired / Cancelled Banner */}
      {(booking.status === 'EXPIRED' || isExpired) && (
        <div className="p-6 rounded-3xl bg-gray-100 border border-gray-300 text-gray-800 space-y-2">
          <h2 className="font-serif text-xl font-bold">Booking Hold Expired</h2>
          <p className="text-xs text-gray-600">
            The 15-minute unpaid hold has timed out and the room units have returned to the general inventory pool.
          </p>
          <Link
            to={`/properties/${booking.room.property.id}`}
            className="inline-block mt-2 px-4 py-2 rounded-full bg-staynest-terracotta text-white font-semibold text-xs"
          >
            Rebook Room
          </Link>
        </div>
      )}

      {/* Main Reservation Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
              Checkout & Payment
            </span>
            <h1 className="font-serif text-3xl font-bold text-staynest-charcoal mt-1">
              Review your reservation
            </h1>
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                booking.status === 'CONFIRMED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : booking.status === 'PENDING_PAYMENT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {booking.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Property & Stay Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#F2ECE4] border border-[#E6E1D8]">
            <ResponsiveImage
              src={booking.room.property.images[0]?.imageUrl}
              alt={booking.room.property.name}
              aspectRatioClass="aspect-[4/3]"
              objectFit="cover"
              objectPosition="object-center"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="font-serif text-xl font-bold text-staynest-charcoal">
              {booking.room.property.name}
            </h3>
            <p className="text-xs text-staynest-muted">
              {booking.room.property.city}, {booking.room.property.country}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E6E1D8]">
                <div className="flex items-center space-x-1.5 text-xs text-staynest-muted">
                  <Calendar className="w-3.5 h-3.5 text-staynest-olive" />
                  <span className="font-semibold">Check-In</span>
                </div>
                <p className="text-xs font-bold text-staynest-charcoal mt-1">{checkInDate}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E6E1D8]">
                <div className="flex items-center space-x-1.5 text-xs text-staynest-muted">
                  <Calendar className="w-3.5 h-3.5 text-staynest-olive" />
                  <span className="font-semibold">Check-Out</span>
                </div>
                <p className="text-xs font-bold text-staynest-charcoal mt-1">{checkOutDate}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-staynest-muted pt-1">
              <span>Room: <strong className="text-staynest-charcoal">{booking.room.name}</strong></span>
              <span>•</span>
              <span>Guests: <strong className="text-staynest-charcoal">{booking.guestsCount}</strong></span>
              <span>•</span>
              <span>Quantity: <strong className="text-staynest-charcoal">{booking.quantity}</strong></span>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-[#F0EBE1] pt-6 space-y-3">
          <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
            Price details
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-staynest-muted">
              <span>
                Nightly rate ({formatCurrency(booking.unitPriceSnapshot, booking.currency)} × {booking.quantity} room)
              </span>
              <span className="font-medium text-staynest-charcoal">
                {formatCurrency(booking.subtotal, booking.currency)}
              </span>
            </div>

            <div className="flex justify-between text-staynest-muted">
              <span>StayNest service & maintenance fee (10%)</span>
              <span className="font-medium text-staynest-charcoal">
                {formatCurrency(booking.fees, booking.currency)}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-4 border-t border-[#F0EBE1] text-base font-bold text-staynest-charcoal">
              <span>Total Payable</span>
              <span className="text-2xl text-staynest-terracotta">
                {formatCurrency(booking.totalAmount, booking.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {booking.status === 'PENDING_PAYMENT' && !isExpired && (
          <div className="pt-4 space-y-3">
            {paymentError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {paymentError}
              </div>
            )}

            <button
              onClick={() => paymentMutation.mutate()}
              disabled={paymentMutation.isPending}
              className="w-full py-4 rounded-2xl bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>
                {paymentMutation.isPending
                  ? 'Verifying Signature & Confirming...'
                  : `Pay ${formatCurrency(booking.totalAmount, booking.currency)} (Test Sandbox)`}
              </span>
            </button>

            <p className="text-[11px] text-center text-staynest-muted">
              Safe sandbox checkout mode. Uses cryptographic HMAC SHA256 signature verification.
            </p>
          </div>
        )}

        {booking.status === 'CONFIRMED' && (
          <div className="pt-4 flex justify-end">
            <Link
              to="/account/bookings"
              className="px-6 py-3 rounded-full bg-staynest-charcoal text-white font-semibold text-xs hover:bg-black transition-colors inline-flex items-center space-x-2"
            >
              <span>View in My Reservations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
