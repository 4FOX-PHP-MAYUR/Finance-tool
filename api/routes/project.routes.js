const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const auth = require('../middlewares/auth.middleware');
const {
  checkPermission,
  checkAnyPermission,
  ASSIGN_VENDOR_MASTER_DATA_ALTS,
} = require("../middlewares/permission.middleware");

const PROJECT_GET_ALTS = [
  ["projects_list", "view"],
  ["projects_add", "add"],
  ["vendor_hod_review", "view"],
  ["vendor_finance_review", "view"],
  ...ASSIGN_VENDOR_MASTER_DATA_ALTS,
];

router.use(auth);

router.post('/', checkPermission("projects_add", "add"), projectController.createProject);
router.get('/', checkAnyPermission(PROJECT_GET_ALTS), projectController.getProjects);
router.get('/:id', checkAnyPermission(PROJECT_GET_ALTS), projectController.getProject);
router.put('/:id', checkPermission("projects_list", "update"), projectController.updateProject);
router.delete('/:id', checkPermission("projects_list", "delete"), projectController.deleteProject);
router.patch('/:id/progress', checkPermission("projects_list", "update"), projectController.updateProgress);
router.patch('/:id/complete', checkPermission("projects_list", "update"), projectController.markComplete);

module.exports = router;
