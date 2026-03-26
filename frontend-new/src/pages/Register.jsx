import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password
    });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <motion.div 
      className="auth-form-container"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="auth-form-header">
        <h1>Create account</h1>
        <p>Get started with ParkEase today</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <motion.div 
            className="auth-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="form-group">
          <label htmlFor="name">Full Name *</label>
          <div className="input-wrapper">
            <User className="input-icon" size={20} />
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <div className="input-wrapper">
            <Phone className="input-icon" size={20} />
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="terms-checkbox">
          <label>
            <input type="checkbox" required />
            <span>
              I agree to the <a href="/terms">Terms of Service</a> and{' '}
              <a href="/privacy">Privacy Policy</a>
            </span>
          </label>
        </div>

        <motion.button
          type="submit"
          className="auth-submit-btn"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {loading ? (
            <div className="btn-loading">
              <div className="btn-spinner"></div>
              <span>Creating account...</span>
            </div>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={20} />
            </>
          )}
        </motion.button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </motion.div>
  );
};

export default Register;
