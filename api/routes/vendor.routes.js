const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const auth = require('../middlewares/auth.middleware');
const {
  checkPermission,
  checkAnyPermission,
  ASSIGN_VENDOR_MASTER_DATA_ALTS,
} = require("../middlewares/permission.middleware");

const VENDOR_GET_ALTS = [
  ["vendor_list", "view"],
  ["vendor_add", "add"],
  ["vendor_hod_review", "view"],
  ["vendor_finance_review", "view"],
  ["so", "view"],
  ["so", "add"],
  ...ASSIGN_VENDOR_MASTER_DATA_ALTS,
];

function uploadVendor(req, res, next) {
  vendorController.vendorUploadMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}

router.use(auth);

router.post('/', checkPermission("vendor_add", "add"), uploadVendor, vendorController.createVendor);
router.get('/', checkAnyPermission(VENDOR_GET_ALTS), vendorController.getVendors);
router.get('/:id', checkAnyPermission(VENDOR_GET_ALTS), vendorController.getVendor);
router.put('/:id', checkPermission("vendor_list", "update"), uploadVendor, vendorController.updateVendor);
router.delete('/:id', checkPermission("vendor_list", "delete"), vendorController.deleteVendor);
router.patch('/:id/active', checkPermission("vendor_list", "update"), vendorController.toggleActive);

module.exports = router;
