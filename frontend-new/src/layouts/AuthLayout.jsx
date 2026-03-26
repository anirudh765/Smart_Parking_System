import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ParkingCircle } from 'lucide-react';
import './AuthLayout.css';

const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <motion.div 
          className="auth-branding"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-logo">
            <ParkingCircle size={48} />
          </div>
          <h1>ParkEase</h1>
          <p>Enterprise Parking Management System</p>
        </motion.div>
        
        <motion.div 
          className="auth-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="feature">
            <span className="feature-icon">🚗</span>
            <div>
              <h3>Smart Slot Allocation</h3>
              <p>Automatic nearest slot assignment using priority queue algorithms</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <div>
              <h3>Real-time Analytics</h3>
              <p>Track revenue, occupancy, and peak hours with detailed insights</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">💳</span>
            <div>
              <h3>Automated Billing</h3>
              <p>Dynamic pricing with peak hour rates and membership discounts</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="auth-right">
        <motion.div 
          className="auth-form-container"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
