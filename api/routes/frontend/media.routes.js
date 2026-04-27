const express = require("express");
const mediaController = require("../../controllers/frontend/media/media.controller");
const router = express.Router();

router.get("/", mediaController.get);

module.exports = router;
