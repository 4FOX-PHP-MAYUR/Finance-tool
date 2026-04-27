const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACTIVATE', 'COMPLETE', 'PROGRESS UPDATE'],
    required: true
  },
  module: {
    type: String,
    required: true
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String
  },
  oldData: {
    type: Object
  },
  newData: {
    type: Object
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Log', logSchema);
