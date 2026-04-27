const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const { assignmentValidationRules, validate } = require('./assignment.validation');
const controller = require('./assignment.controller');

// Calendar view — must be before /:id to avoid route collision
router.get('/calendar', auth, controller.getCalendar);

router.get('/', auth, controller.getAssignments);
router.post('/', auth, assignmentValidationRules.create, validate, controller.createAssignment);
router.put('/:id', auth, assignmentValidationRules.update, validate, controller.updateAssignment);
router.delete('/:id', auth, controller.deleteAssignment);

module.exports = router;