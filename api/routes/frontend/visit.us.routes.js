const express = require("express");
const visitUsController = require("../../controllers/frontend/visitUs/visit.us.controller");
const router = express.Router();

router.get("/", visitUsController.get);

module.exports = router;
