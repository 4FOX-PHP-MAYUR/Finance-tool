const express = require("express");
const contactUsController = require("../../controllers/admin/contactUs/contactUs.controller");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");

router.post("/", auth, contactUsController.add);
router.get("/", auth, contactUsController.get);
router.get("/:contactId", auth, contactUsController.getById);
router.patch(
  "/update-status/:contactId",
  auth,
  contactUsController.activeInactive
);
router.delete("/:contactId", auth, contactUsController.delete);

module.exports = router;
