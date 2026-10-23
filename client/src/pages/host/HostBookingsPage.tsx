import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, formatCurrency } from '../../lib/api';
import { Calendar, Users, Mail, MapPin, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface HostBooking {
  id: string;
  status: 'CONFIRMED' | 'PENDING_PAYMENT' | 'CANCELLED' | 'EXPIRED';
  checkIn: string;
  checkOut: string;
  quantity: number;
  guestsCount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  guest: { id: string; name: string; email: string };
  room: {
    name: string;
    property: { name: string; city: string };
  };
}

export const HostBookingsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery<{ bookings: HostBooking[] }>({
    queryKey: ['host-bookings'],
    queryFn: () => apiFetch<{ bookings: HostBooking[] }>('/host/bookings'),
  });

  const bookings = data?.bookings || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-staynest-olive">
          Host Portal
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal mt-1">
          Guest Reservations
        </h1>
        <p className="text-xs text-staynest-muted mt-1">
          View incoming bookings, verified payments, and guest itineraries across all your properties.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-xs text-red-600">
            Failed to load reservations.
          </div>
        ) : bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0EBE1] text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
                  <th className="pb-3 pl-2">Guest</th>
                  <th className="pb-3">Property & Room</th>
                  <th className="pb-3">Dates</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Payout Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAFAF7]">
                    <td className="py-4 pl-2">
                      <p className="font-bold text-staynest-charcoal">{b.guest.name}</p>
                      <p className="text-[11px] text-staynest-muted flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span>{b.guest.email}</span>
                      </p>
                    </td>

                    <td className="py-4">
                      <p className="font-semibold text-staynest-charcoal">{b.room.property.name}</p>
                      <p className="text-[11px] text-staynest-muted">
                        {b.room.name} ({b.quantity} room) • {b.guestsCount} guests
                      </p>
                    </td>

                    <td className="py-4">
                      <p className="font-medium text-staynest-charcoal">
                        {new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'PENDING_PAYMENT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-4 text-right pr-2">
                      <span className="font-bold text-staynest-charcoal text-sm">
                        {formatCurrency(b.totalAmount, b.currency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 space-y-2">
            <Calendar className="w-10 h-10 text-staynest-muted mx-auto" />
            <p className="font-serif text-lg font-bold">No reservations yet</p>
            <p className="text-xs text-staynest-muted">
              Incoming bookings from guests will appear here as soon as reservations are created.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
