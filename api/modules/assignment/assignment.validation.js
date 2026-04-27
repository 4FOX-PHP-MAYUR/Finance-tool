const { body, validationResult } = require('express-validator');

const assignmentValidationRules = {
  create: [
    body('clientId')
      .notEmpty().withMessage('clientId is required')
      .isMongoId().withMessage('clientId must be a valid ObjectId'),
    body('projectId')
      .notEmpty().withMessage('projectId is required')
      .isMongoId().withMessage('projectId must be a valid ObjectId'),
    body('departmentId')
      .notEmpty().withMessage('departmentId is required')
      .isMongoId().withMessage('departmentId must be a valid ObjectId'),
    body('taskDescription')
      .notEmpty().withMessage('taskDescription is required')
      .trim(),

    // resources array
    body('resources')
      .isArray({ min: 1 }).withMessage('resources must have at least one entry'),
    body('resources.*.employeeId')
      .notEmpty().withMessage('employeeId is required in each resource')
      .isMongoId().withMessage('employeeId must be a valid ObjectId'),
    body('resources.*.allocations')
      .isArray({ min: 1 }).withMessage('Each resource must have at least one allocation'),
    body('resources.*.allocations.*.startDate')
      .notEmpty().withMessage('startDate is required in each allocation')
      .isISO8601().toDate().withMessage('startDate must be a valid date'),
    body('resources.*.allocations.*.endDate')
      .notEmpty().withMessage('endDate is required in each allocation')
      .isISO8601().toDate().withMessage('endDate must be a valid date')
      .custom((endDate, { req, path }) => {
        // Extract resource index and allocation index from path
        const match = path.match(/resources\[(\d+)\]\.allocations\[(\d+)\]/);
        if (match) {
          const ri = parseInt(match[1]);
          const ai = parseInt(match[2]);
          const startDate = req.body.resources?.[ri]?.allocations?.[ai]?.startDate;
          if (startDate && new Date(endDate) < new Date(startDate)) {
            throw new Error('endDate must be greater than or equal to startDate');
          }
        }
        return true;
      }),
    body('resources.*.allocations.*.notes')
      .optional().trim(),
    body('resources.*.allocations.*.allocationStatus')
      .optional()
      .isIn(['AVAILABLE', 'BOOKED', 'HALF_DAY', 'ON_LEAVE'])
      .withMessage('allocationStatus must be one of: AVAILABLE, BOOKED, HALF_DAY, ON_LEAVE'),
  ],

  update: [
    body('taskDescription').optional().trim(),

    body('resources')
      .optional()
      .isArray({ min: 1 }).withMessage('resources must have at least one entry'),
    body('resources.*.employeeId')
      .optional()
      .isMongoId().withMessage('employeeId must be a valid ObjectId'),
    body('resources.*.allocations')
      .optional()
      .isArray({ min: 1 }).withMessage('Each resource must have at least one allocation'),
    body('resources.*.allocations.*.startDate')
      .optional()
      .isISO8601().toDate().withMessage('startDate must be a valid date'),
    body('resources.*.allocations.*.endDate')
      .optional()
      .isISO8601().toDate().withMessage('endDate must be a valid date')
      .custom((endDate, { req, path }) => {
        if (!req.body.resources) return true;
        const match = path.match(/resources\[(\d+)\]\.allocations\[(\d+)\]/);
        if (match) {
          const ri = parseInt(match[1]);
          const ai = parseInt(match[2]);
          const startDate = req.body.resources?.[ri]?.allocations?.[ai]?.startDate;
          if (startDate && new Date(endDate) < new Date(startDate)) {
            throw new Error('endDate must be greater than or equal to startDate');
          }
        }
        return true;
      }),
    body('resources.*.allocations.*.notes')
      .optional().trim(),
    body('resources.*.allocations.*.allocationStatus')
      .optional()
      .isIn(['AVAILABLE', 'BOOKED', 'HALF_DAY', 'ON_LEAVE'])
      .withMessage('allocationStatus must be one of: AVAILABLE, BOOKED, HALF_DAY, ON_LEAVE'),
  ]
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { assignmentValidationRules, validate };