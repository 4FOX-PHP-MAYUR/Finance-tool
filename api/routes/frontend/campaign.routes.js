const express = require("express");
const campaignController = require("../../controllers/frontend/ourBrandAmbassadors/campaign.controller");
const router = express.Router();

router.get("/", campaignController.get);

module.exports = router;
