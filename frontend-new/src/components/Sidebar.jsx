import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ParkingCircle, LogOut, Search, 
  BarChart3, Calendar, Settings, Car, ChevronLeft, 
  ChevronRight, Receipt, Mic
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      title: 'Main',
      items: [
        { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/park', name: 'Park Vehicle', icon: Car },
        { path: '/exit', name: 'Exit Vehicle', icon: LogOut },
        { path: '/voice', name: 'Voice Assistant', icon: Mic },
        { path: '/lookup', name: 'Vehicle Lookup', icon: Search },
      ]
    },
    {
      title: 'Management',
      items: [
        { path: '/status', name: 'Parking Status', icon: ParkingCircle },
        // { path: '/reservations', name: 'Reservations', icon: Calendar },
        { path: '/transactions', name: 'Transactions', icon: Receipt },
        { path: '/analytics', name: 'Analytics', icon: BarChart3},
      ]
    },
    {
      title: 'Account',
      items: [
        { path: '/settings', name: 'Settings', icon: Settings },
      ]
    }
  ];

  const closeSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.2 }}
      >
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <ParkingCircle size={24} />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="logo-text"
              >
                ParkEase
              </motion.span>
            )}
          </div>
          <button
            className="collapse-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((section, idx) => (
            <div key={idx} className="nav-section">
              {!collapsed && (
                <span className="section-title">{section.title}</span>
              )}
              <ul className="nav-list">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        onClick={closeSidebar}
                        title={collapsed ? item.name : undefined}
                      >
                        <div className="nav-icon">
                          <Icon size={20} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="nav-text">{item.name}</span>
                            {item.badge && (
                              <span className="nav-badge">{item.badge}</span>
                            )}
                          </>
                        )}
                        {isActive && (
                          <motion.div
                            className="active-indicator"
                            layoutId="activeIndicator"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>




      </motion.aside>
    </>
  );
};

export default Sidebar;
