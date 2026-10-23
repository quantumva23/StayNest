import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, formatCurrency } from '../../lib/api';
import { PlusCircle, Home, Calendar, Users, ArrowUpRight, Bed } from 'lucide-react';

interface HostProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  status: string;
  images: Array<{ imageUrl: string }>;
  rooms: Array<{ id: string; name: string; capacity: number; pricePerNight: number; totalUnits: number }>;
  _count: { rooms: number };
}

export const HostDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useQuery<{ properties: HostProperty[] }>({
    queryKey: ['host-properties'],
    queryFn: () => apiFetch<{ properties: HostProperty[] }>('/host/properties'),
  });

  const properties = data?.properties || [];
  const totalRooms = properties.reduce((acc, p) => acc + (p.rooms?.length || 0), 0);
  const totalUnits = properties.reduce(
    (acc, p) => acc + (p.rooms?.reduce((rSum, r) => rSum + r.totalUnits, 0) || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-staynest-olive">
            Host Management Portal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal mt-1">
            My Accommodations
          </h1>
          <p className="text-xs text-staynest-muted mt-1">
            Manage your properties, pooled room categories, rates, and guest reservations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/host/bookings"
            className="px-4 py-2.5 rounded-full border border-[#E6E1D8] bg-white text-staynest-charcoal text-xs font-semibold hover:bg-[#FAFAF7] flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4 text-staynest-olive" />
            <span>Host Reservations</span>
          </Link>
          <Link
            to="/host/properties/new"
            className="px-5 py-2.5 rounded-full bg-staynest-terracotta hover:bg-staynest-terracotta-dark text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Property</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#E6E1D8] shadow-subtle space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-staynest-muted">Properties</p>
          <p className="text-3xl font-serif font-bold text-staynest-charcoal">{properties.length}</p>
          <p className="text-[11px] text-staynest-muted">Active published listings</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E6E1D8] shadow-subtle space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-staynest-muted">Room Categories</p>
          <p className="text-3xl font-serif font-bold text-staynest-olive">{totalRooms}</p>
          <p className="text-[11px] text-staynest-muted">Configured room types</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E6E1D8] shadow-subtle space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-staynest-muted">Total Units Pool</p>
          <p className="text-3xl font-serif font-bold text-staynest-terracotta">{totalUnits}</p>
          <p className="text-[11px] text-staynest-muted">Total reservable room units</p>
        </div>
      </div>

      {/* Property Listings */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle space-y-6">
        <h2 className="font-serif text-2xl font-bold text-staynest-charcoal">
          Your Listings
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-28 bg-[#FAFAF7] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-xs text-red-600">
            Failed to load host properties. Please ensure you are logged in as a host.
          </div>
        ) : properties.length > 0 ? (
          <div className="space-y-4">
            {properties.map((property) => (
              <div
                key={property.id}
                className="p-5 rounded-2xl border border-[#E6E1D8] bg-[#FAFAF7] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                    <img
                      src={property.images[0]?.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-staynest-sand text-staynest-olive">
                        {property.type}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {property.status}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-staynest-charcoal mt-1">
                      {property.name}
                    </h3>
                    <p className="text-xs text-staynest-muted">
                      {property.city} • {property.rooms?.length || 0} room categories
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Link
                    to={`/properties/${property.id}`}
                    className="px-4 py-2 rounded-full border border-[#E6E1D8] bg-white text-staynest-charcoal text-xs font-semibold hover:border-gray-400 flex items-center space-x-1"
                  >
                    <span>View Public Page</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <Home className="w-10 h-10 text-staynest-muted mx-auto" />
            <h3 className="font-serif text-xl font-bold">No properties listed yet</h3>
            <p className="text-xs text-staynest-muted max-w-sm mx-auto">
              Start earning by listing your boutique hotel, lounge, or guest house on StayNest.
            </p>
            <Link
              to="/host/properties/new"
              className="inline-block px-5 py-2.5 rounded-full bg-staynest-terracotta text-white font-semibold text-xs"
            >
              Create Your First Listing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
