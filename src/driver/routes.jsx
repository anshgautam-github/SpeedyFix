import { Navigate, Route } from 'react-router-dom';
import { RequireAuth } from '../portal/auth/AuthContext';
import DriverShell from './layout/DriverShell';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import NavigationPage from './pages/NavigationPage';
import HandoverPage from './pages/HandoverPage';
import HistoryPage from './pages/HistoryPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

/**
 * Nest these inside the portal's providers route so authentication is shared:
 *   <Route element={<PortalProviders />}> ...customer routes... {driverRoutes()} </Route>
 * Route guards only improve the experience. The backend must authorize every driver call (see src/driver/README.md).
 */
export function driverRoutes() {
  return (
    <Route path="/driver" element={<RequireAuth role="driver"><DriverShell /></RequireAuth>}>
      <Route index element={<Navigate to="/driver/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="jobs" element={<JobsPage />} />
      <Route path="jobs/:jobId" element={<JobDetailPage />} />
      <Route path="navigation/:jobId" element={<NavigationPage />} />
      <Route path="handover/:jobId" element={<HandoverPage />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  );
}
