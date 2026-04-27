const express = require('express');
const partnerController = require('../../controllers/frontend/ourPartner/our.partner.controller');
const router = express.Router()



router.get('/',partnerController.getAllPartner);



module.exports = router;