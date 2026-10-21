import { Navigate, Route } from 'react-router-dom';
import PortalProviders from './layout/PortalProviders';
import PortalShell from './layout/PortalShell';
import { GuestOnly, RequireAuth } from './auth/AuthContext';
import AuthScreen from './auth/AuthScreen';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import VehiclesPage from './pages/VehiclesPage';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import BookingDetailPage from './pages/BookingDetailPage';
import TrackingPage, { TrackingIndex } from './pages/TrackingPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import HelpPage from './pages/HelpPage';
import { driverRoutes } from '../driver/routes';
import { centerRoutes } from '../center/routes';
import { adminRoutes } from '../admin/routes';

/**
 * Drop these routes inside your existing <Routes>:
 *   <Routes>{/* your routes *\/}{portalRoutes()}</Routes>
 * Each portal has its own sign-in screen (/login, /driver/login, /service-center/login, /admin/login) plus /signup and
 * /forgot-password. Authentication is not configured: those screens validate input and say so. If you already have
 * sign-in routes, remove these guest routes and reuse yours.
 */
export function portalRoutes() {
  return (
    <Route element={<PortalProviders />}>
      <Route path="/login" element={<GuestOnly><AuthScreen portal="customer" /></GuestOnly>} />
      <Route path="/driver/login" element={<GuestOnly><AuthScreen portal="driver" /></GuestOnly>} />
      <Route path="/service-center/login" element={<GuestOnly><AuthScreen portal="center" /></GuestOnly>} />
      <Route path="/admin/login" element={<GuestOnly><AuthScreen portal="admin" /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
      <Route path="/customer" element={<RequireAuth role="customer"><PortalShell /></RequireAuth>}>
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/new" element={<NewBookingPage />} />
        <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="tracking" element={<TrackingIndex />} />
        <Route path="tracking/:bookingId" element={<TrackingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      {driverRoutes()}
      {centerRoutes()}
      {adminRoutes()}
    </Route>
  );
}
