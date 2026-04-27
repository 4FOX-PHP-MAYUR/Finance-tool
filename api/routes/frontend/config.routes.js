const express = require("express");
const configController = require("../../controllers/frontend/configData/config.controller");
const router = express.Router();

router.get("/", configController.getConfig);

module.exports = router;
