import { Navigate, Route } from 'react-router-dom';
import { RequireAuth } from '../portal/auth/AuthContext';
import AccessDenied from '../center/pages/AccessDenied';
import AdminShell from './layout/AdminShell';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import AssignmentsPage from './pages/AssignmentsPage';
import JourneysPage from './pages/JourneysPage';
import HandoversPage from './pages/HandoversPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import ServiceCentersPage from './pages/ServiceCentersPage';
import ServiceCenterDetailPage from './pages/ServiceCenterDetailPage';
import CustomersPage from './pages/CustomersPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';

/**
 * Nest inside the portal providers route (shared authentication). Signed-in users without the admin role see an
 * access-denied page. Route guards only improve the experience: the backend must authorize every call and check the
 * administrator level (see src/admin/README.md).
 */
export function adminRoutes() {
  return (
    <Route path="/admin" element={<RequireAuth role="admin" denied={<AccessDenied />}><AdminShell /></RequireAuth>}>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="bookings" element={<BookingsPage />} />
      <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
      <Route path="assignments" element={<AssignmentsPage />} />
      <Route path="journeys" element={<JourneysPage />} />
      <Route path="handovers" element={<HandoversPage />} />
      <Route path="work-orders" element={<WorkOrdersPage />} />
      <Route path="vehicles" element={<VehiclesPage />} />
      <Route path="drivers" element={<DriversPage />} />
      <Route path="service-centers" element={<ServiceCentersPage />} />
      <Route path="service-centers/:centerId" element={<ServiceCenterDetailPage />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="users/:userId" element={<UserDetailPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="audit-logs" element={<AuditLogsPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
  );
}
