const mongoose = require('mongoose');

const registrationDocSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    originalName: { type: String, default: '' },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    vendorName: { type: String, required: true, trim: true },
    vendorEmail: { type: String, trim: true },
    accountsContactName: { type: String, trim: true },
    accountsContactEmail: { type: String, trim: true },
    accountsContactPhone: { type: String, trim: true },
    accountsContactAddress: { type: String, trim: true },
    regularContactName: { type: String, trim: true },
    regularContactEmail: { type: String, trim: true },
    regularContactPhone: { type: String, trim: true },
    regularContactAddress: { type: String, trim: true },
    vendorAddress: { type: String, trim: true },
    description: { type: String, trim: true, default: '' },
    currency: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    taxRate: { type: String, trim: true, default: '' },
    licenseNo: { type: String, trim: true, default: '' },
    licenseExpiryDate: { type: Date, default: null },
    taxCertificate: { type: Boolean, default: false },
    licenseUpload: { type: registrationDocSchema, default: null },
    taxLaterCertificate: { type: registrationDocSchema, default: null },
    companyRegistrationDocs: { type: [registrationDocSchema], default: [] },
    bankDetailsDocs: { type: [registrationDocSchema], default: [] },
    isActive: { type: Boolean, default: true },
    status: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);
