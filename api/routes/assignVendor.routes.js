const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  checkPermission,
  checkAnyPermission,
  ASSIGN_VENDOR_MASTER_DATA_ALTS,
} = require("../middlewares/permission.middleware");
const controller = require("../controllers/assignVendor.controller");

const ASSIGN_VENDOR_GET_ALTS = [
  ["assigned_vendors", "view"],
  ["vendor_hod_review", "view"],
  ["vendor_finance_review", "view"],
  ["vendor_admin_approval", "view"],
  ...ASSIGN_VENDOR_MASTER_DATA_ALTS,
];

router.use(auth);

router.get("/business-orders", checkAnyPermission(ASSIGN_VENDOR_GET_ALTS), controller.listBusinessOrdersForProject);
router.get(
  "/business-orders/:id",
  checkAnyPermission(ASSIGN_VENDOR_GET_ALTS),
  controller.getBusinessOrderForAssign,
);
router.get("/", checkAnyPermission(ASSIGN_VENDOR_GET_ALTS), controller.getAssignVendors);
router.get("/:id", checkAnyPermission(ASSIGN_VENDOR_GET_ALTS), controller.getAssignVendor);
router.post("/", checkPermission("assign_vendor", "add"), controller.assignVendorUploadMiddleware, controller.createAssignVendor);
router.put("/:id", checkAnyPermission([["assign_vendor", "update"], ["vendor_hod_review", "update"], ["vendor_finance_review", "update"]]), controller.assignVendorUploadMiddleware, controller.updateAssignVendor);
router.delete("/:id", checkPermission("assign_vendor", "delete"), controller.deleteAssignVendor);

module.exports = router;
