import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch, formatCurrency } from '../../lib/api';
import { ShieldCheck, Users, Home, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'properties' | 'users' | 'bookings'>('properties');

  // Load properties
  const {
    data: propertiesData,
    isLoading: isPropsLoading,
    refetch: refetchProps,
  } = useQuery<{ properties: any[] }>({
    queryKey: ['admin-properties'],
    queryFn: () => apiFetch<{ properties: any[] }>('/admin/properties'),
    enabled: activeTab === 'properties',
  });

  // Load users
  const {
    data: usersData,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery<{ users: any[] }>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<{ users: any[] }>('/admin/users'),
    enabled: activeTab === 'users',
  });

  // Load bookings
  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
  } = useQuery<{ bookings: any[] }>({
    queryKey: ['admin-bookings'],
    queryFn: () => apiFetch<{ bookings: any[] }>('/admin/bookings'),
    enabled: activeTab === 'bookings',
  });

  // Mutation to change property status
  const propertyStatusMutation = useMutation({
    mutationFn: ({ propertyId, status }: { propertyId: string; status: string }) =>
      apiFetch(`/admin/properties/${propertyId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => refetchProps(),
  });

  // Mutation to change user active status
  const userStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => refetchUsers(),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Platform Administrator Console</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-staynest-charcoal">
          Admin Moderation & Governance
        </h1>
        <p className="text-xs text-staynest-muted mt-1">
          Review properties, moderate user accounts, and audit all reservations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E6E1D8] space-x-8">
        <button
          onClick={() => setActiveTab('properties')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'properties'
              ? 'border-staynest-terracotta text-staynest-terracotta'
              : 'border-transparent text-staynest-muted hover:text-staynest-charcoal'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Listing Moderation</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-staynest-terracotta text-staynest-terracotta'
              : 'border-transparent text-staynest-muted hover:text-staynest-charcoal'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'bookings'
              ? 'border-staynest-terracotta text-staynest-terracotta'
              : 'border-transparent text-staynest-muted hover:text-staynest-charcoal'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Global Bookings</span>
        </button>
      </div>

      {/* Tab: Properties */}
      {activeTab === 'properties' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle">
          <h2 className="font-serif text-xl font-bold text-staynest-charcoal mb-4">
            All Listings Queue
          </h2>

          {isPropsLoading ? (
            <p className="text-xs text-staynest-muted">Loading properties...</p>
          ) : propertiesData?.properties && propertiesData.properties.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0EBE1] text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
                    <th className="pb-3 pl-2">Property</th>
                    <th className="pb-3">Host</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Moderate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {propertiesData.properties.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAFAF7]">
                      <td className="py-4 pl-2">
                        <p className="font-bold text-staynest-charcoal">{p.name}</p>
                        <p className="text-[11px] text-staynest-muted">{p.city}, {p.country}</p>
                      </td>
                      <td className="py-4">
                        <p className="font-semibold text-staynest-charcoal">{p.host.name}</p>
                        <p className="text-[11px] text-staynest-muted">{p.host.email}</p>
                      </td>
                      <td className="py-4 font-medium">{p.type}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2 space-x-1.5">
                        {p.status !== 'ACTIVE' && (
                          <button
                            onClick={() =>
                              propertyStatusMutation.mutate({ propertyId: p.id, status: 'ACTIVE' })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100"
                          >
                            Approve (Active)
                          </button>
                        )}
                        {p.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() =>
                              propertyStatusMutation.mutate({ propertyId: p.id, status: 'REJECTED' })
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-100"
                          >
                            Reject
                          </button>
                        )}
                        {p.status !== 'INACTIVE' && (
                          <button
                            onClick={() =>
                              propertyStatusMutation.mutate({ propertyId: p.id, status: 'INACTIVE' })
                            }
                            className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-[11px] font-semibold hover:bg-gray-100"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-staynest-muted">No properties found.</p>
          )}
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle">
          <h2 className="font-serif text-xl font-bold text-staynest-charcoal mb-4">
            Registered Users
          </h2>

          {isUsersLoading ? (
            <p className="text-xs text-staynest-muted">Loading users...</p>
          ) : usersData?.users && usersData.users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0EBE1] text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
                    <th className="pb-3 pl-2">User</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Properties / Bookings</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersData.users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAFAF7]">
                      <td className="py-4 pl-2">
                        <p className="font-bold text-staynest-charcoal">{u.name}</p>
                        <p className="text-[11px] text-staynest-muted">{u.email}</p>
                      </td>
                      <td className="py-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-staynest-sand text-staynest-charcoal">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-4 text-[11px] text-staynest-muted">
                        {u._count?.properties || 0} properties • {u._count?.bookings || 0} bookings
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() =>
                            userStatusMutation.mutate({ userId: u.id, isActive: !u.isActive })
                          }
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-staynest-muted">No users found.</p>
          )}
        </div>
      )}

      {/* Tab: Bookings */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6E1D8] shadow-subtle">
          <h2 className="font-serif text-xl font-bold text-staynest-charcoal mb-4">
            System Reservations
          </h2>

          {isBookingsLoading ? (
            <p className="text-xs text-staynest-muted">Loading reservations...</p>
          ) : bookingsData?.bookings && bookingsData.bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0EBE1] text-[11px] font-bold uppercase tracking-wider text-staynest-muted">
                    <th className="pb-3 pl-2">Booking ID</th>
                    <th className="pb-3">Guest</th>
                    <th className="pb-3">Property</th>
                    <th className="pb-3">Dates</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookingsData.bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAFAF7]">
                      <td className="py-4 pl-2 font-mono text-[11px] text-staynest-muted">
                        #{b.id.substring(0, 8)}
                      </td>
                      <td className="py-4 font-semibold text-staynest-charcoal">
                        {b.guest.name}
                      </td>
                      <td className="py-4">
                        {b.room.property.name} ({b.room.name})
                      </td>
                      <td className="py-4">
                        {new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-staynest-sand text-staynest-charcoal">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2 font-bold text-staynest-charcoal">
                        {formatCurrency(b.totalAmount, b.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-staynest-muted">No reservations recorded in system yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
