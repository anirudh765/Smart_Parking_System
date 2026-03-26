import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, ParkingCircle, Search } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <motion.div
        className="not-found-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="error-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <ParkingCircle size={60} />
          <span className="error-badge">404</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Page Not Found
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Oops! It seems like this parking spot doesn't exist. 
          The page you're looking for might have been moved or deleted.
        </motion.p>

        <motion.div 
          className="action-buttons"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/dashboard" className="primary-btn">
            <Home size={18} />
            Go to Dashboard
          </Link>
          <button onClick={() => window.history.back()} className="secondary-btn">
            <ArrowLeft size={18} />
            Go Back
          </button>
        </motion.div>

        <motion.div 
          className="search-suggestion"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Search size={16} />
          <span>Or try searching for what you need</span>
        </motion.div>
      </motion.div>

      {/* Background decoration */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );
};

export default NotFound;
