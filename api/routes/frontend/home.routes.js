const express = require('express');
const homeController = require('../../controllers/frontend/home/home.controller');
const router = express.Router()


router.get('/',homeController.get);



module.exports = router;