const express = require("express");
const contactUsController = require("../../controllers/frontend/contactUs/contact.us.controller");
const router = express.Router();

router.post("/", contactUsController.add);
//router.get("/", contactUsController.get);

module.exports = router;
