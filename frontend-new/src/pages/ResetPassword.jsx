import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/api';
import './Auth.css';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, { password });
      toast.success('Password reset successful');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to reset password');
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
        <h1>Reset password</h1>
        <p>Enter a new password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirm">Confirm Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type="password"
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
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
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <span>Update password</span>
              <ArrowRight size={20} />
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default ResetPassword;
