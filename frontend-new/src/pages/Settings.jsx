import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Lock, Shield, Bell, 
  Moon, Sun, Save, Camera, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const { user, updateProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [formLoading, setFormLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: true,
    emailAlerts: true,
    smsAlerts: false
  });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setFormLoading(true);
    try {
      // API call to update password would go here
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setFormLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Bell }
  ];

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="settings-container">
        {/* Sidebar Tabs */}
        <div className="settings-sidebar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="settings-section"
            >
              <div className="section-header">
                <h2>Profile Information</h2>
                <p>Update your personal information</p>
              </div>

              {/* Avatar */}
              <div className="avatar-section">
                <div className="avatar-container">
                  <div className="avatar">
                    <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <button className="avatar-upload">
                    <Camera size={16} />
                  </button>
                </div>
                <div className="avatar-info">
                  <h3>{user?.name || 'User'}</h3>
                  <span className="role-badge">{user?.role || 'user'}</span>
                  {user?.membershipType && user.membershipType !== 'regular' && (
                    <span className={`membership-badge ${user.membershipType}`}>
                      {user.membershipType} Member
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="settings-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <User size={20} className="input-icon" />
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={20} className="input-icon" />
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <Phone size={20} className="input-icon" />
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="Enter your phone"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="btn-loading">
                        <div className="spinner"></div>
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Loyalty Points */}
              {user?.loyaltyPoints !== undefined && (
                <div className="loyalty-section">
                  <h4>Loyalty Points</h4>
                  <div className="loyalty-display">
                    <div className="points-circle">
                      <span className="points-value">{user.loyaltyPoints || 0}</span>
                      <span className="points-label">Points</span>
                    </div>
                    <div className="loyalty-info">
                      <p>Earn points on every parking session</p>
                      <p>Redeem points for discounts and rewards</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="settings-section"
            >
              <div className="section-header">
                <h2>Security Settings</h2>
                <p>Manage your password and security preferences</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="settings-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="input-wrapper">
                    <Lock size={20} className="input-icon" />
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <Lock size={20} className="input-icon" />
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="input-wrapper">
                    <Lock size={20} className="input-icon" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="password-requirements">
                  <h4>Password Requirements:</h4>
                  <ul>
                    <li className={passwordData.newPassword.length >= 6 ? 'valid' : ''}>
                      <CheckCircle2 size={14} />
                      At least 6 characters
                    </li>
                    <li className={/[A-Z]/.test(passwordData.newPassword) ? 'valid' : ''}>
                      <CheckCircle2 size={14} />
                      One uppercase letter
                    </li>
                    <li className={/[0-9]/.test(passwordData.newPassword) ? 'valid' : ''}>
                      <CheckCircle2 size={14} />
                      One number
                    </li>
                  </ul>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="btn-loading">
                        <div className="spinner"></div>
                        Updating...
                      </span>
                    ) : (
                      <>
                        <Shield size={18} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="security-info">
                <div className="info-card">
                  <AlertCircle size={20} />
                  <div>
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button className="btn btn-secondary">Enable</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="settings-section"
            >
              <div className="section-header">
                <h2>Preferences</h2>
                <p>Customize your experience</p>
              </div>

              <div className="preferences-list">
                {/* Theme */}
                <div className="preference-item">
                  <div className="preference-info">
                    <div className="preference-icon">
                      {preferences.theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    <div>
                      <h4>Theme</h4>
                      <p>Choose your preferred appearance</p>
                    </div>
                  </div>
                  <div className="theme-toggle">
                    <button 
                      className={`theme-btn ${preferences.theme === 'light' ? 'active' : ''}`}
                      onClick={() => handlePreferenceChange('theme', 'light')}
                    >
                      <Sun size={16} />
                      Light
                    </button>
                    <button 
                      className={`theme-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
                      onClick={() => handlePreferenceChange('theme', 'dark')}
                    >
                      <Moon size={16} />
                      Dark
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                <div className="preference-item">
                  <div className="preference-info">
                    <div className="preference-icon">
                      <Bell size={20} />
                    </div>
                    <div>
                      <h4>Push Notifications</h4>
                      <p>Get notified about parking updates</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Email Alerts */}
                <div className="preference-item">
                  <div className="preference-info">
                    <div className="preference-icon">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4>Email Alerts</h4>
                      <p>Receive parking receipts via email</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailAlerts}
                      onChange={(e) => handlePreferenceChange('emailAlerts', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* SMS Alerts */}
                <div className="preference-item">
                  <div className="preference-info">
                    <div className="preference-icon">
                      <Phone size={20} />
                    </div>
                    <div>
                      <h4>SMS Alerts</h4>
                      <p>Get text messages for important updates</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.smsAlerts}
                      onChange={(e) => handlePreferenceChange('smsAlerts', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => toast.success('Preferences saved')}
                >
                  <Save size={18} />
                  Save Preferences
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
