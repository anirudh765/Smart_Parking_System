import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/api';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword({ email: email.trim() });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send reset email');
    } finally {
      setLoading(false);
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
        <h1>Forgot password</h1>
        <p>We will email you a reset link</p>
      </div>

      {sent ? (
        <div className="auth-error" style={{ background: 'var(--success-50)', borderColor: 'var(--success-500)', color: 'var(--success-600)' }}>
          <AlertCircle size={18} />
          <span>Check your inbox for the reset link.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
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
                <span>Sending...</span>
              </div>
            ) : (
              <>
                <span>Send reset link</span>
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </form>
      )}
    </motion.div>
  );
};

export default ForgotPassword;
