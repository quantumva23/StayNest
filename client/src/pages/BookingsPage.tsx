import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, formatCurrency, messageForError } from '../lib/api';
import { ResponsiveImage } from '../components/common/ResponsiveImage';
import { useAuth } from '../features/auth/AuthContext';
import { Calendar, MapPin, AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight, Building2 } from 'lucide-react';

interface BookingItem {
  id: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  checkIn: string;
  checkOut: string;
  quantity: number;
  guestsCount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  room: {
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

export const BookingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<{ bookings: BookingItem[] }>({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch<{ bookings: BookingItem[] }>('/bookings/me'),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiFetch(`/bookings/${bookingId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      refetch();
    },
    onError: (err: unknown) => {
      setCancelError(messageForError(err));
    },
  });

  const handleCancel = (bookingId: string) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      setCancelError(null);
      cancelMutation.mutate(bookingId);
    }
  };

  const getStatusBadge = (status: BookingItem['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed</span>
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Payment Hold</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            <span>Expired Hold</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal">
            My Reservations
          </h1>
          <p className="text-xs text-staynest-muted mt-1">
            Manage your personal upcoming stays, pending inventory holds, and receipts.
          </p>
        </div>
        {user?.role === 'HOST' && (
          <Link
            to="/host/bookings"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-staynest-olive/10 border border-staynest-olive/20 text-staynest-olive text-xs font-semibold hover:bg-staynest-olive/20 transition-all self-start sm:self-auto"
          >
            <Building2 className="w-4 h-4" />
            <span>View Guest Bookings On My Stays</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {cancelError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
          {cancelError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 bg-white rounded-3xl border border-[#E6E1D8] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-3xl border border-[#E6E1D8] text-center text-xs text-red-600">
          {messageForError(error)}
        </div>
      ) : data?.bookings && data.bookings.length > 0 ? (
        <div className="space-y-4">
          {data.bookings.map((booking) => {
            const checkInFormatted = new Date(booking.checkIn).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E6E1D8] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-5">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#F2ECE4] shrink-0 border border-[#E6E1D8]">
                    <ResponsiveImage
                      src={booking.room.property.images[0]?.imageUrl}
                      alt={booking.room.property.name}
                      aspectRatioClass="aspect-square"
                      objectFit="cover"
                      objectPosition="object-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(booking.status)}
                      <span className="text-[11px] text-staynest-muted font-mono">
                        #{booking.id.substring(0, 8)}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-staynest-charcoal">
                      {booking.room.property.name}
                    </h3>

                    <div className="flex items-center text-xs text-staynest-muted space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-staynest-terracotta" />
                      <span>{booking.room.property.city}, {booking.room.property.country}</span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-staynest-charcoal pt-1">
                      <span className="flex items-center space-x-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-staynest-olive" />
                        <span>{checkInFormatted} – {checkOutFormatted}</span>
                      </span>
                      <span>•</span>
                      <span>{booking.room.name} ({booking.quantity} room)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 border-[#F0EBE1] shrink-0 gap-3">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-staynest-muted block">Total Paid</span>
                    <span className="text-xl font-bold text-staynest-charcoal">
                      {formatCurrency(booking.totalAmount, booking.currency)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {booking.status === 'PENDING_PAYMENT' && (
                      <Link
                        to={`/checkout/${booking.id}`}
                        className="px-4 py-2 rounded-full bg-staynest-terracotta text-white font-semibold text-xs hover:bg-staynest-terracotta-dark"
                      >
                        Complete Payment
                      </Link>
                    )}

                    {booking.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelMutation.isPending}
                        className="px-3.5 py-1.5 rounded-full border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      >
                        Cancel Stay
                      </button>
                    )}

                    <Link
                      to={`/checkout/${booking.id}`}
                      className="p-2 rounded-full border border-[#E6E1D8] text-staynest-charcoal hover:bg-[#FAFAF7]"
                      title="View Details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E6E1D8] p-12 text-center space-y-4">
          <Calendar className="w-12 h-12 text-staynest-muted mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">
            No reservations found
          </h2>
          <p className="text-xs text-staynest-muted max-w-sm mx-auto">
            You don't have any bookings yet. Explore our handpicked boutique stays and secure your next escape.
          </p>
          <Link
            to="/explore"
            className="inline-block px-6 py-2.5 rounded-full bg-staynest-terracotta text-white font-semibold text-xs"
          >
            Explore Accommodations
          </Link>
        </div>
      )}
    </div>
  );
};
