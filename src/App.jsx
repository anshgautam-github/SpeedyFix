import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './landing/LandingPage.jsx';
import { portalRoutes } from './portal/routes.jsx';

// If your project already has a router, keep it and just add {portalRoutes()} inside your existing <Routes>.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {portalRoutes()}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
