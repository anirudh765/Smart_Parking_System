import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt, Search, Filter, Download, Calendar, 
  ChevronLeft, ChevronRight, Car, Bike, Truck, 
  Zap, CreditCard, Banknote, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { analyticsService } from '../services/api';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: '7days'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getHistory({ limit: 100 });
      const sessions = response.data.data || [];
      const mapped = sessions.map(s => ({
        id: s._id,
        vehicleNumber: s.vehicleId,
        vehicleType: s.vehicleType,
        action: 'exit',
        amount: s.totalAmount || 0,
        status: 'completed',
        paymentMethod: s.paymentMethod || null,
        slot: s.slotCode,
        timestamp: s.exitTime || s.entryTime,
      }));
      setTransactions(mapped);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'car': return Car;
      case 'bike': return Bike;
      case 'truck': return Truck;
      case 'electric': return Zap;
      default: return Car;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'failed': return XCircle;
      default: return AlertCircle;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filters.type === 'all' || t.vehicleType === filters.type;
    const matchesStatus = filters.status === 'all' || t.status === filters.status;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Paginate
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate summary stats
  const totalRevenue = transactions
    .filter(t => t.action === 'exit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalEntries = transactions.filter(t => t.action === 'entry').length;
  const totalExits = transactions.filter(t => t.action === 'exit').length;
  const pendingPayments = transactions.filter(t => t.status === 'pending').length;

  return (
    <motion.div
      className="transactions-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <Receipt className="page-icon" />
          <div>
            <h1>Transactions</h1>
            <p>View and manage all parking transactions</p>
          </div>
        </div>
        <button className="export-btn">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <motion.div 
          className="summary-card revenue"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="summary-icon">
            <Receipt size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Revenue</span>
            <span className="summary-value">₹{totalRevenue.toFixed(2)}</span>
          </div>
          <span className="summary-badge positive">
            <ArrowUpRight size={14} />
            12%
          </span>
        </motion.div>

        <motion.div 
          className="summary-card entries"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="summary-icon">
            <ArrowDownRight size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Entries</span>
            <span className="summary-value">{totalEntries}</span>
          </div>
        </motion.div>

        <motion.div 
          className="summary-card exits"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="summary-icon">
            <ArrowUpRight size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Exits</span>
            <span className="summary-value">{totalExits}</span>
          </div>
        </motion.div>

        <motion.div 
          className="summary-card pending"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="summary-icon">
            <Clock size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Pending</span>
            <span className="summary-value">{pendingPayments}</span>
          </div>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <motion.div 
        className="transactions-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Table Controls */}
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by vehicle number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="control-buttons">
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              Filters
            </button>
            <button className="date-btn">
              <Calendar size={18} />
              Last 7 days
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div 
            className="filters-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="filter-group">
              <label>Vehicle Type</label>
              <select 
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">All Types</option>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
                <option value="electric">Electric</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button 
              className="clear-filters"
              onClick={() => setFilters({ type: 'all', status: 'all', dateRange: '7days' })}
            >
              Clear Filters
            </button>
          </motion.div>
        )}

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="table-loading">
              <div className="spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="table-empty">
              <Receipt size={48} />
              <h3>No transactions found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Action</th>
                  <th>Slot</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction, idx) => {
                  const VehicleIcon = getVehicleIcon(transaction.vehicleType);
                  const StatusIcon = getStatusIcon(transaction.status);
                  
                  return (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <td>
                        <div className="vehicle-cell">
                          <div className={`vehicle-icon ${transaction.vehicleType}`}>
                            <VehicleIcon size={16} />
                          </div>
                          <div className="vehicle-info">
                            <span className="vehicle-number">{transaction.vehicleNumber}</span>
                            <span className="vehicle-type">{transaction.vehicleType}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`action-badge ${transaction.action}`}>
                          {transaction.action === 'entry' ? (
                            <><ArrowDownRight size={14} /> Entry</>
                          ) : (
                            <><ArrowUpRight size={14} /> Exit</>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="slot-badge">{transaction.slot}</span>
                      </td>
                      <td>
                        <span className="amount">
                          {transaction.amount > 0 ? `$${transaction.amount.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td>
                        {transaction.paymentMethod ? (
                          <span className="payment-method">
                            {transaction.paymentMethod === 'card' ? (
                              <><CreditCard size={14} /> Card</>
                            ) : (
                              <><Banknote size={14} /> Cash</>
                            )}
                          </span>
                        ) : (
                          <span className="no-payment">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${transaction.status}`}>
                          <StatusIcon size={14} />
                          {transaction.status}
                        </span>
                      </td>
                      <td>
                        <div className="datetime">
                          <span className="date">{formatDate(transaction.timestamp)}</span>
                          <span className="time">{formatTime(transaction.timestamp)}</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} transactions
            </span>
            <div className="pagination-controls">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Transactions;
