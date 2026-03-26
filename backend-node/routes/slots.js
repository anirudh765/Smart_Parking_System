const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  getSlots,
  getSlot,
  getSlotsSummary,
  createSlot,
  updateSlot,
  setMaintenance,
  deleteSlot
} = require('../controllers/slotController');

// Public routes
router.get('/', getSlots);
router.get('/summary', getSlotsSummary);
router.get('/:id', getSlot);

// Protected routes (Admin/Operator)
router.post('/', protect, authorize('admin', 'operator'), createSlot);
router.put('/:id', protect, authorize('admin', 'operator'), updateSlot);
router.put('/:id/maintenance', protect, authorize('admin', 'operator'), setMaintenance);
router.delete('/:id', protect, authorize('admin'), deleteSlot);

module.exports = router;
