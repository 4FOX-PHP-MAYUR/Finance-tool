const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Vendor = require('../models/vendor.model');
const { createLog } = require('../services/log.service');

const UPLOAD_SUBDIR = 'vendors';
const PUBLIC_PREFIX = '/public/uploads';

function uploadDir() {
  const dir = path.join(__dirname, '..', 'public', 'uploads', UPLOAD_SUBDIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safe = `vendor-doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

function registrationFileFilter(_req, file, cb) {
  const allowed = /\.(pdf|png|jpe?g|gif|webp|doc|docx)$/i;
  if (!allowed.test(file.originalname)) {
    return cb(new Error('Registration documents: allowed types are PDF, images, Word (.doc, .docx).'));
  }
  cb(null, true);
}

exports.vendorUploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: registrationFileFilter,
}).fields([
  { name: 'companyRegistrationDocs', maxCount: 30 },
  { name: 'bankDetailsDocs', maxCount: 30 },
  { name: 'licenseUpload', maxCount: 1 },
  { name: 'taxLaterCertificate', maxCount: 1 },
]);

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
  };
}

function textField(body, key) {
  if (body[key] === undefined || body[key] === null) return undefined;
  return String(body[key]).trim();
}

function mapUploadedFiles(files, fieldName = 'companyRegistrationDocs') {
  const list = files && files[fieldName] ? files[fieldName] : [];
  return list.map((f) => ({
    path: `${PUBLIC_PREFIX}/${UPLOAD_SUBDIR}/${f.filename}`,
    originalName: f.originalname || f.filename,
  }));
}

function mapUploadedSingleFile(files, fieldName) {
  const list = files && files[fieldName] ? files[fieldName] : [];
  if (!list.length) return null;
  const file = list[0];
  return {
    path: `${PUBLIC_PREFIX}/${UPLOAD_SUBDIR}/${file.filename}`,
    originalName: file.originalname || file.filename,
  };
}

function parseRetainedDocs(body, retainField = 'companyRegistrationDocsRetain') {
  const raw = body[retainField];
  if (raw == null || raw === '') return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === 'string' && p.length > 0);
  } catch {
    return [];
  }
}

function parseBooleanField(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

function parseDateField(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

exports.createVendor = async (req, res) => {
  try {
    const body = req.body || {};
    const vendorName = textField(body, 'vendorName');
    if (!vendorName) {
      return res.status(400).json({ message: 'vendorName is required' });
    }

    const createdBy = req.user.id || req.user._id || req.user.userId;
    const newDocs = mapUploadedFiles(req.files, 'companyRegistrationDocs');
    const newBankDocs = mapUploadedFiles(req.files, 'bankDetailsDocs');
    const licenseUpload = mapUploadedSingleFile(req.files, 'licenseUpload');
    const taxLaterCertificate = mapUploadedSingleFile(req.files, 'taxLaterCertificate');

    const payload = {
      vendorName,
      vendorEmail: textField(body, 'vendorEmail') || '',
      accountsContactName: textField(body, 'accountsContactName') || '',
      accountsContactEmail: textField(body, 'accountsContactEmail') || '',
      accountsContactPhone: textField(body, 'accountsContactPhone') || '',
      accountsContactAddress: textField(body, 'accountsContactAddress') || '',
      regularContactName: textField(body, 'regularContactName') || '',
      regularContactEmail: textField(body, 'regularContactEmail') || '',
      regularContactPhone: textField(body, 'regularContactPhone') || '',
      regularContactAddress: textField(body, 'regularContactAddress') || '',
      vendorAddress: textField(body, 'vendorAddress') || '',
      description: textField(body, 'description') || '',
      currency: textField(body, 'currency') || '',
      country: textField(body, 'country') || '',
      taxRate: textField(body, 'taxRate') || '',
      licenseNo: textField(body, 'licenseNo') || '',
      licenseExpiryDate: parseDateField(body.licenseExpiryDate),
      taxCertificate: parseBooleanField(body.taxCertificate, false),
      licenseUpload,
      taxLaterCertificate,
      companyRegistrationDocs: newDocs,
      bankDetailsDocs: newBankDocs,
    };
    if (createdBy) payload.createdBy = createdBy;

    const vendor = await Vendor.create(payload);
    if (createdBy) {
      const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
      await createLog({
        userId: createdBy,
        role,
        action: 'CREATE',
        module: 'vendors',
        recordId: vendor._id,
        newData: vendor,
        ...getRequestMeta(req),
      });
    }
    res.status(201).json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: true }).sort({ vendorName: 1 });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, status: true });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, status: true });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const oldData = { ...vendor._doc };
    const body = req.body || {};

    if (body.vendorName !== undefined) {
      const vn = textField(body, 'vendorName');
      if (!vn) return res.status(400).json({ message: 'vendorName cannot be empty' });
      vendor.vendorName = vn;
    }
    const stringFields = [
      'vendorEmail',
      'accountsContactName',
      'accountsContactEmail',
      'accountsContactPhone',
      'accountsContactAddress',
      'regularContactName',
      'regularContactEmail',
      'regularContactPhone',
      'regularContactAddress',
      'vendorAddress',
      'description',
      'currency',
      'country',
      'taxRate',
      'licenseNo',
    ];
    for (const key of stringFields) {
      if (body[key] !== undefined) {
        vendor[key] = textField(body, key) || '';
      }
    }
    if (body.taxCertificate !== undefined) {
      vendor.taxCertificate = parseBooleanField(body.taxCertificate, false);
    }
    if (body.licenseExpiryDate !== undefined) {
      vendor.licenseExpiryDate = parseDateField(body.licenseExpiryDate);
    }

    const retainedPaths = parseRetainedDocs(body, 'companyRegistrationDocsRetain');
    const retainedBankPaths = parseRetainedDocs(body, 'bankDetailsDocsRetain');
    const newDocs = mapUploadedFiles(req.files, 'companyRegistrationDocs');
    const newBankDocs = mapUploadedFiles(req.files, 'bankDetailsDocs');
    const newLicenseUpload = mapUploadedSingleFile(req.files, 'licenseUpload');
    const newTaxLaterCertificate = mapUploadedSingleFile(req.files, 'taxLaterCertificate');

    if (retainedPaths !== null || newDocs.length > 0) {
      const existing = vendor.companyRegistrationDocs || [];
      const kept =
        retainedPaths !== null
          ? existing.filter((d) => retainedPaths.includes(d.path))
          : existing;
      vendor.companyRegistrationDocs = [...kept, ...newDocs];
    }
    if (retainedBankPaths !== null || newBankDocs.length > 0) {
      const existing = vendor.bankDetailsDocs || [];
      const kept =
        retainedBankPaths !== null
          ? existing.filter((d) => retainedBankPaths.includes(d.path))
          : existing;
      vendor.bankDetailsDocs = [...kept, ...newBankDocs];
    }
    if (body.licenseUploadRetain !== undefined && !parseBooleanField(body.licenseUploadRetain, false)) {
      vendor.licenseUpload = null;
    }
    if (newLicenseUpload) {
      vendor.licenseUpload = newLicenseUpload;
    }
    if (body.taxLaterCertificateRetain !== undefined && !parseBooleanField(body.taxLaterCertificateRetain, false)) {
      vendor.taxLaterCertificate = null;
    }
    if (newTaxLaterCertificate) {
      vendor.taxLaterCertificate = newTaxLaterCertificate;
    }

    await vendor.save();

    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'UPDATE',
      module: 'vendors',
      recordId: vendor._id,
      oldData,
      newData: vendor,
      ...getRequestMeta(req),
    });
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, status: true });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    const oldData = { ...vendor._doc };
    vendor.status = false;
    await vendor.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'DELETE',
      module: 'vendors',
      recordId: vendor._id,
      oldData,
      newData: vendor,
      ...getRequestMeta(req),
    });
    res.json({ message: 'Vendor soft deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, status: true });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    const oldData = { ...vendor._doc };
    vendor.isActive = !vendor.isActive;
    await vendor.save();
    const userId = req.user.id || req.user._id || req.user.userId;
    const role = req.user.role || req.user.userRole || req.user.type || 'unknown';
    await createLog({
      userId,
      role,
      action: 'ACTIVATE',
      module: 'vendors',
      recordId: vendor._id,
      oldData,
      newData: vendor,
      ...getRequestMeta(req),
    });
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
