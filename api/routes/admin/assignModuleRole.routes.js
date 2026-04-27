const express = require("express");
const auth = require("../../middlewares/auth.middleware");
const { checkPermission } = require("../../middlewares/permission.middleware");
const controller = require("../../controllers/admin/assignModuleRole.controller");
const {
  assignModuleRoleBodyRules,
  assignModuleRoleUserParam,
  validate,
} = require("../../middlewares/validation.middleware");

const router = express.Router();

router.use(auth);

router.post("/", checkPermission("permissions_assign", "add"), assignModuleRoleBodyRules, validate, controller.assignModuleRole);
router.get("/", checkPermission("permissions_manage", "view"), controller.listAssignModuleRoles);
router.get("/user/:userId", checkPermission("permissions_manage", "view"), assignModuleRoleUserParam, validate, controller.getByUserId);
router.delete(
  "/:userId",
  checkPermission("permissions_assign", "delete"),
  assignModuleRoleUserParam,
  validate,
  controller.removeAssignModuleRole
);

module.exports = router;
