const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const auth = require('../middlewares/auth.middleware');

// All log routes are JWT protected
router.use(auth);

router.get('/', logController.getLogs);

module.exports = router;
