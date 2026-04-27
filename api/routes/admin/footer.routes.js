const express = require("express");
const footerController = require("../../controllers/admin/footer/footer.controller");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");

router.post("/", auth, footerController.add);
router.get("/", auth, footerController.get);
router.get("/:footerId", auth, footerController.getById);
router.patch("/:footerId", auth, footerController.update);
//router.patch("/update-status/:footerId", auth, footerController.activeInactive);
//router.delete("/:footerId", auth, footerController.delete);

module.exports = router;
