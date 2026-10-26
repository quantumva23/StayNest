import React from 'react';
import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../features/auth/AuthContext';

// Pages
import { HomePage } from '../pages/HomePage';
import { ExplorePage } from '../pages/ExplorePage';
import { PropertyDetailPage } from '../pages/PropertyDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { BookingsPage } from '../pages/BookingsPage';
import { HostDashboardPage } from '../pages/host/HostDashboardPage';
import { NewPropertyPage } from '../pages/host/NewPropertyPage';
import { HostBookingsPage } from '../pages/host/HostBookingsPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

// Root Layout wrapper with Navbar & Footer
const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

// Protected Route Guard for Guests
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="p-20 text-center text-xs text-staynest-muted">Checking authentication...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Protected Route Guard for Hosts
const HostRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="p-20 text-center text-xs text-staynest-muted">Checking authentication...</div>;
  }
  if (!user || (user.role !== 'HOST' && user.role !== 'ADMIN')) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Protected Route Guard for Admins
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="p-20 text-center text-xs text-staynest-muted">Checking authentication...</div>;
  }
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public pages
      { index: true, element: <HomePage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'properties/:propertyId', element: <PropertyDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },

      // Guest protected pages
      {
        path: 'bookings',
        element: <Navigate to="/account/bookings" replace />,
      },
      {
        path: 'account/bookings',
        element: (
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checkout/:bookingId',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },

      // Host protected pages
      {
        path: 'host',
        element: (
          <HostRoute>
            <HostDashboardPage />
          </HostRoute>
        ),
      },
      {
        path: 'host/properties/new',
        element: (
          <HostRoute>
            <NewPropertyPage />
          </HostRoute>
        ),
      },
      {
        path: 'host/bookings',
        element: (
          <HostRoute>
            <HostBookingsPage />
          </HostRoute>
        ),
      },

      // Admin protected pages
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        ),
      },

      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
