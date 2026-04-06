const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  dedupeKey: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  targetModel: {
    type: String,
    default: null
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  recipient: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  subject: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'skipped'],
    default: 'sent'
  },
  error: {
    type: String,
    default: null
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

NotificationLogSchema.index({ dedupeKey: 1, status: 1 });

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
