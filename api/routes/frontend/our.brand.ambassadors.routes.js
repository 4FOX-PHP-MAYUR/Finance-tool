const express = require("express");
const ourBrandAmbassadorsController = require("../../controllers/frontend/ourBrandAmbassadors/our.brand.ambassadors.controller");
const router = express.Router();

router.get("/", ourBrandAmbassadorsController.get);

module.exports = router;
