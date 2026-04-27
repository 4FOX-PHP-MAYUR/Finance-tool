const express = require("express");
const permissionController = require("../../controllers/admin/user.permission.controller");
const auth = require("../../middlewares/auth.middleware");
const { checkPermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.get("/me", auth, permissionController.getMyPermissions);

// Fetch permissions for a specific role
router.get("/roles/:roleId", auth, checkPermission("permissions_manage", "view"), permissionController.getRolePermissions);

// Assign / update permissions for a specific role
router.post("/roles/:roleId", auth, checkPermission("permissions_assign", "add"), permissionController.assignPermissions);

// Optional: copy permissions from one role to another
router.post("/copy", auth, checkPermission("permissions_assign", "add"), permissionController.copyPermissions);

module.exports = router;
