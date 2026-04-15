import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import UserPortal from './pages/UserPortal';
import Dashboard from './pages/Dashboard';
import ParkVehicle from './pages/ParkVehicle';
import ExitVehicle from './pages/ExitVehicle';
import VoiceAssistant from './pages/VoiceAssistant';
import VehicleLookup from './pages/VehicleLookup';
import ParkingStatus from './pages/ParkingStatus';
import Reservations from './pages/Reservations';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public user portal — no login required */}
      <Route path="/" element={<UserPortal />} />

      {/* Admin auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Admin app routes — admin only */}
      <Route element={<ProtectedRoute roles={['admin']}><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/park" element={<ParkVehicle />} />
        <Route path="/exit" element={<ExitVehicle />} />
        <Route path="/voice" element={<VoiceAssistant />} />
        <Route path="/lookup" element={<VehicleLookup />} />
        <Route path="/status" element={<ParkingStatus />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute roles={['admin', 'operator']}>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
