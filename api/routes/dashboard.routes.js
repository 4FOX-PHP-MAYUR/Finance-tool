const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const dashboardController = require("../controllers/dashboard.controller");

router.use(auth);

// Aggregate KPIs only — any logged-in user may load (RBAC still applies to detail routes).
router.get("/summary", dashboardController.getSummary);

module.exports = router;

