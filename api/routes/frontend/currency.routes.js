const express = require("express");
const currencyController = require("../../controllers/frontend/configData/currency.controller");
const router = express.Router();

router.get("/", currencyController.get);
router.put("/", currencyController.update);

module.exports = router;
