const express = require("express");
const reviewController = require("../../controllers/frontend/review/review.controller");

const router = express.Router();

router.get("/", reviewController.get);

module.exports = router;
