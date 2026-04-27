const express = require("express");
const configController = require("../../controllers/admin/configData/config.controller");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");

router.post("/", auth, configController.add);
router.post("/uploadTest", auth, configController.uploadTest);
router.get("/", auth, configController.get);
router.patch("/:configId", auth, configController.update);
//router.delete("/:configId", auth, configController.deleteSubscription);
//router.patch("/update-status/:configId", auth, configController.activeInactive);

module.exports = router;
