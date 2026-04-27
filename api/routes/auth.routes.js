const express = require('express');
const authController = require('../controllers/admin/auth.controller');
const auth = require("../middlewares/auth.middleware");
const { checkPermission } = require("../middlewares/permission.middleware");
const router = express.Router()


router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.post('/create-user', auth, checkPermission("users_add", "add"), authController.createUser);
router.get('/me', auth, authController.me);



module.exports = router;