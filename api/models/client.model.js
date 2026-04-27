const mongoose = require('mongoose');

function computeClientNameKey(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const clientSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
  },
  /** Lowercase, trimmed, single-spaced — used for deduplication and lookups. */
  clientNameKey: {
    type: String,
    maxlength: 512,
    default: '',
  },
  /** When true, client was auto-created from invoice PDF import (minimal fields). */
  invoiceImportSource: {
    type: Boolean,
    default: false,
  },
  contactPerson: {
    type: String,
  },
  clientEmail: {
    type: String,
  },
  clientMobile: {
    type: String,
  },
  /** Billing / registered address (e.g. from invoice PDF import). */
  clientAddress: {
    type: String,
  },
  /** Tax registration number (e.g. UAE TRN from invoice). */
  trn: {
    type: String,
  },
  clientImage: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

clientSchema.pre('save', function (next) {
  if (this.clientName) {
    this.clientNameKey = computeClientNameKey(this.clientName);
  }
  next();
});

clientSchema.index(
  { clientNameKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { status: true } }
);

module.exports = mongoose.model('Client', clientSchema);
