const express = require("express");
const enquireController = require("../../controllers/frontend/enquire/enquire.controller");
const router = express.Router();

router.post("/", enquireController.add);
//router.get("/", enquireController.get);


module.exports = router;
