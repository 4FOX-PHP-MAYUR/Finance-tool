const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth.middleware');
const {
  checkPermission,
  checkAnyPermission,
  USER_DIRECTORY_READ_ALTS,
} = require("../middlewares/permission.middleware");
const userController = require('../controllers/user.controller');
const { userValidationRules, validate } = require('../middlewares/validation.middleware');
const { userProfileImageUpload } = require('../middlewares/user.profile.image.upload.middleware');

// POST   /api/users        — Register user (public); multipart when profile image is included
router.post('/', userProfileImageUpload, userValidationRules.create, validate, userController.registerUser);

// GET    /api/users                          — Get all users (auth required)
router.get('/', auth, checkAnyPermission(USER_DIRECTORY_READ_ALTS), userController.getAllUsers);

// GET    /api/users/me                       — Get own profile (auth required)
router.get('/me', auth, userController.getMyProfile);

// GET    /api/users/department/:departmentId — Get users by department (auth required)
// MUST be registered before /:id so Express does not treat "department" as an id param
router.get('/department/:departmentId', auth, checkAnyPermission(USER_DIRECTORY_READ_ALTS), userController.getUsersByDepartment);

// GET    /api/users/:id                      — Get single user (auth required)
router.get('/:id', auth, checkAnyPermission(USER_DIRECTORY_READ_ALTS), userController.getUser);

// PATCH  /api/users/:id/restore — Restore soft-deleted user (auth required)
router.patch('/:id/restore', auth, checkPermission("users_list", "update"), userController.restoreUser);

// PUT    /api/users/me                       — Update own profile (auth required)
router.put('/me', auth, userProfileImageUpload, userController.updateMyProfile);

// PUT    /api/users/:id    — Update user (auth required); multipart when profile image is included
router.put('/:id', auth, checkPermission("users_list", "update"), userProfileImageUpload, userValidationRules.update, validate, userController.updateUser);

// PATCH  /api/users/:id    — Partial update user (auth required)
router.patch('/:id', auth, checkPermission("users_list", "update"), userProfileImageUpload, userValidationRules.update, validate, userController.updateUser);

// DELETE /api/users/:id    — Soft-delete user (auth required)
router.delete('/:id', auth, checkPermission("users_list", "delete"), userController.deleteUser);

module.exports = router;