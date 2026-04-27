const express = require("express");
const moduleController = require("../../controllers/admin/module.controller");
const auth = require("../../middlewares/auth.middleware");
const { checkPermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.post("/", auth, checkPermission("permissions_manage", "add"), moduleController.createModule);
router.get("/", auth, checkPermission("permissions_manage", "view"), moduleController.getModules);

module.exports = router;
