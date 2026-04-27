const express = require('express');
const router  = express.Router();

const auth = require('../middlewares/auth.middleware');
const { checkPermission } = require("../middlewares/permission.middleware");
const { resourceAllocationValidationRules } = require('../middlewares/validation.middleware');
const controller = require('../controllers/resourceAllocation.controller');

// All routes are JWT-protected
router.post(  '/',    auth, checkPermission("resource_allocation", "add"), resourceAllocationValidationRules.create, controller.createResourceAllocation);
router.get(   '/',    auth, checkPermission("resource_allocation", "view"), controller.getResourceAllocations);
router.get(   '/:id', auth, checkPermission("resource_allocation", "view"), controller.getResourceAllocation);
router.put(   '/:id', auth, checkPermission("resource_allocation", "update"), resourceAllocationValidationRules.update, controller.updateResourceAllocation);
router.delete('/:id', auth, checkPermission("resource_allocation", "delete"), controller.deleteResourceAllocation);

module.exports = router;