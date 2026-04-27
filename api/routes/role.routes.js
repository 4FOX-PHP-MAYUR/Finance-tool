const express = require('express');
const router = express.Router();
const roleController = require('../controllers/admin/role/role.controller');
const auth = require('../middlewares/auth.middleware');
const {
  checkPermission,
  checkAnyPermission,
  ROLE_DIRECTORY_READ_ALTS,
} = require("../middlewares/permission.middleware");
const { roleValidationRules, roleParamValidation, validate } = require('../middlewares/validation.middleware');

// All role routes require JWT authentication
router.use(auth);

router.post('/', checkPermission("roles_add", "add"), roleValidationRules.create, validate, roleController.addRole);
router.get('/', checkAnyPermission(ROLE_DIRECTORY_READ_ALTS), roleController.getRoles);
router.get('/:id', checkAnyPermission(ROLE_DIRECTORY_READ_ALTS), roleParamValidation, validate, roleController.getRoleById);
router.put('/:id', checkPermission("roles_list", "update"), roleParamValidation, roleValidationRules.update, validate, roleController.updateRole);
router.delete('/:id', checkPermission("roles_list", "delete"), roleParamValidation, validate, roleController.deleteRole);

module.exports = router;
