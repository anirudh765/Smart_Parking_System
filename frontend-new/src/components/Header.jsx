import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Bell, Search, ChevronDown, 
  User, Settings, LogOut, Moon, Sun, 
  HelpCircle, Keyboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('parkease_theme');
    return saved === 'dark';
  });

  // Apply theme on mount and whenever darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('parkease_theme', newMode ? 'dark' : 'light');
  };
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  // Sample notifications
  const notifications = [
    { id: 1, type: 'info', message: 'Vehicle ABC-1234 parked in Slot A12', time: '2 min ago', read: false },
    { id: 2, type: 'success', message: 'Payment of $25.00 received', time: '15 min ago', read: false },
    { id: 3, type: 'warning', message: 'Slot B7 requires maintenance', time: '1 hour ago', read: true },
    { id: 4, type: 'info', message: 'New reservation confirmed', time: '2 hours ago', read: true },
  ];

  const unreadCount = 0;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="menu-btn mobile-only" onClick={toggleSidebar}>
            <Menu size={22} />
          </button>

          <button 
            className="search-trigger"
            onClick={() => setShowSearch(true)}
          >
            <Search size={18} />
            <span className="search-placeholder">Search...</span>
            <kbd className="search-shortcut">⌘K</kbd>
          </button>
        </div>

        <div className="header-right">
          {/* Dark Mode Toggle */}
          <button 
            className="icon-btn"
            onClick={toggleDarkMode}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notifications */}
          <div className="notification-wrapper" ref={notifRef}>
            <button 
              className="icon-btn notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="notification-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <button className="mark-read-btn">Mark all read</button>
                  </div>
                  <div className="notification-list">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`notification-item ${notif.read ? 'read' : ''}`}
                      >
                        <div className={`notif-dot ${notif.type}`} />
                        <div className="notif-content">
                          <p>{notif.message}</p>
                          <span className="notif-time">{notif.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-footer">
                    <button>View all notifications</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="user-menu-wrapper" ref={userMenuRef}>
            <button 
              className="user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <span>{getInitials(user?.name)}</span>
                )}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-role">{user?.role || 'Member'}</span>
              </div>
              <ChevronDown size={16} className={`chevron ${showUserMenu ? 'open' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  className="user-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="dropdown-user-info">
                    <div className="dropdown-avatar">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        <span>{getInitials(user?.name)}</span>
                      )}
                    </div>
                    <div>
                      <p className="dropdown-name">{user?.name || 'User'}</p>
                      <p className="dropdown-email">{user?.email || 'user@example.com'}</p>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  <button className="dropdown-item" onClick={() => navigate('/settings')}>
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button className="dropdown-item" onClick={() => navigate('/settings')}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button className="dropdown-item">
                    <Keyboard size={16} />
                    <span>Shortcuts</span>
                  </button>
                  <button className="dropdown-item">
                    <HelpCircle size={16} />
                    <span>Help & Support</span>
                  </button>

                  <div className="dropdown-divider" />

                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="search-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              className="search-modal"
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="search-input-wrapper">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search vehicles, slots, reservations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <kbd>ESC</kbd>
              </div>
              <div className="search-results">
                <p className="search-hint">
                  Start typing to search across vehicles, parking slots, and reservations
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
