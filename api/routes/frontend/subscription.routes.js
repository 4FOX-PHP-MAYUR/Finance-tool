const express = require("express");
const subscriptionController = require("../../controllers/frontend/subscription/subscription.controller");
const router = express.Router();

router.post("/", subscriptionController.addSubscription);
router.patch("/unsubscribe", subscriptionController.activeInactive);

module.exports = router;
