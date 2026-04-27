const express = require("express");
const enquireController = require("../../controllers/admin/enquire/enquire.controller");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");

router.post("/", auth, enquireController.add);
router.get("/", auth, enquireController.get);
router.get("/:enquireId", auth, enquireController.getById);
router.patch(
  "/update-status/:enquireId",
  auth,
  enquireController.activeInactive
);
router.delete("/:enquireId", auth, enquireController.delete);

module.exports = router;
