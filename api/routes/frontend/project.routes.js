const express = require("express");
const projectController = require("../../controllers/frontend/projects/project.controller");
const buildingController = require("../../controllers/frontend/projects/project.building.controller");
const flatController = require("../../controllers/frontend/projects/project.flat.controller");

const router = express.Router();


router.get("/grouped-projects", projectController.getGroupedProjects);
router.get("/:projectTitle", projectController.getProjectByTitle);
router.get("/", projectController.get);
//router.get("/:projectId", projectController.getProjectById);

router.get("/building/:projectId", buildingController.getBuildingByProjectId);
router.get("/flat/:flatId", flatController.getFlatById);





module.exports = router;
