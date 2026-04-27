const express = require("express");
const footerController = require("../../controllers/frontend/footer/footer.controller");
const router = express.Router();

router.get("/", footerController.get);

module.exports = router;
