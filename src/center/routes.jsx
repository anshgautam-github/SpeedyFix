import { Navigate, Route } from 'react-router-dom';
import { RequireAuth } from '../portal/auth/AuthContext';
import CenterShell from './layout/CenterShell';
import AccessDenied from './pages/AccessDenied';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import BookingDetailPage from './pages/BookingDetailPage';
import ReceivingPage from './pages/ReceivingPage';
import VehiclesPage from './pages/VehiclesPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderDetailPage from './pages/WorkOrderDetailPage';
import TechniciansPage from './pages/TechniciansPage';
import DeliveriesPage from './pages/DeliveriesPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

/**
 * Nest inside the portal providers route (shared authentication), next to customerRoutes and driverRoutes.
 * Signed-in users without the service-center role see an access-denied page. Route guards only improve the experience:
 * the backend must authorize every call and scope it to the staff member's own center (see src/center/README.md).
 */
export function centerRoutes() {
  return (
    <Route path="/service-center" element={<RequireAuth role="center" denied={<AccessDenied />}><CenterShell /></RequireAuth>}>
      <Route index element={<Navigate to="/service-center/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="bookings" element={<BookingsPage />} />
      <Route path="bookings/new" element={<NewBookingPage />} />
      <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
      <Route path="receiving" element={<ReceivingPage />} />
      <Route path="vehicles" element={<VehiclesPage />} />
      <Route path="work-orders" element={<WorkOrdersPage />} />
      <Route path="work-orders/:workOrderId" element={<WorkOrderDetailPage />} />
      <Route path="technicians" element={<TechniciansPage />} />
      <Route path="deliveries" element={<DeliveriesPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
  );
}
