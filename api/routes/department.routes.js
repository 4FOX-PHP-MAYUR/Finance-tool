const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const { departmentValidationRules } = require('../middlewares/validation.middleware');
const auth = require('../middlewares/auth.middleware');
const {
  checkPermission,
  checkAnyPermission,
  DEPARTMENT_DIRECTORY_READ_ALTS,
} = require("../middlewares/permission.middleware");

// All routes are JWT-protected
router.post('/', auth, checkPermission("departments", "add"), departmentValidationRules.create, departmentController.createDepartment);
// Search, pagination, and includeDeleted handled in controller
router.get('/', auth, checkAnyPermission(DEPARTMENT_DIRECTORY_READ_ALTS), departmentController.getDepartments);
// Restore soft-deleted department
router.patch('/:id/restore', auth, checkPermission("departments", "update"), departmentController.restoreDepartment);
router.get('/:id', auth, checkAnyPermission(DEPARTMENT_DIRECTORY_READ_ALTS), departmentController.getDepartment);
router.put('/:id', auth, checkPermission("departments", "update"), departmentValidationRules.update, departmentController.updateDepartment);
router.delete('/:id', auth, checkPermission("departments", "delete"), departmentController.deleteDepartment);

module.exports = router;
