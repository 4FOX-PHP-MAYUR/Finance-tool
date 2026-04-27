const express = require("express");
const controller = require("../../controllers/frontend/projects/project.config.controller");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");

router.get("/", controller.get);
router.get("/:configId", controller.getById);



module.exports = router;
