const { body, param, validationResult } = require('express-validator');
const validator = require('validator');
const { normalizeUserEmail } = require('../utils/normalizeEmail');
// Project validation rules
const projectValidationRules = () => [
  body('projectName')
    .notEmpty().withMessage('Project Name is required')
    .matches(/^[A-Za-z0-9 ]+$/).withMessage('Only letters, numbers, and spaces allowed')
    .isLength({ max: 60 }).withMessage('Max length is 60'),
  body('projectDescription')
    .optional()
    .isLength({ max: 500 }).withMessage('Max length is 500'),
  body('projectImage')
    .optional()
    .custom((value, { req }) => {
      if (!value) return true;
      const allowed = ['jpg', 'jpeg', 'png'];
      const ext = value.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) throw new Error('Invalid image type');
      // Optionally check file size if available
      return true;
    }),
  body('isCompleted')
    .optional()
    .isBoolean().withMessage('isCompleted must be boolean'),
  body('projectPercentageCompleted')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
  body('startDate')
    .notEmpty().withMessage('Start Date is required')
    .isISO8601().toDate().withMessage('Start Date must be a valid date'),
  body('endDate')
    .notEmpty().withMessage('End Date is required')
    .isISO8601().toDate().withMessage('End Date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End Date must be after Start Date');
      }
      return true;
    }),
  body('status')
    .optional()
    .isBoolean().withMessage('Status must be boolean'),
  body().custom(body => {
    if (body.isCompleted && body.projectPercentageCompleted !== 100) {
      throw new Error('If project is completed, percentage must be 100');
    }
    return true;
  })
];


const departmentValidationRules = {
  create: [
    body('departmentName')
      .trim()
      .notEmpty().withMessage('Department name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Department name must be between 2 and 100 characters'),
    body('departmentDescription')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 200 }).withMessage('Department description must be at most 200 characters'),
  ],
  update: [
    body('departmentName')
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Department name must be between 2 and 100 characters'),
    body('departmentDescription')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 200 }).withMessage('Department description must be at most 200 characters'),
  ]
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const roleValidationRules = {
  create: [
    body('roleName')
      .notEmpty().withMessage('Role name is required')
      .isLength({ min: 3 }).withMessage('Role name must be at least 3 characters')
      .isLength({ max: 50 }).withMessage('Role name must be at most 50 characters')
      .matches(/^[A-Za-z @&]+$/).withMessage('Role name can only contain letters, spaces, @ and &'),
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('status')
      .optional()
      .isBoolean().withMessage('Status must be a boolean'),
  ],
  update: [
    body('roleName')
      .optional()
      .isLength({ min: 3 }).withMessage('Role name must be at least 3 characters')
      .isLength({ max: 50 }).withMessage('Role name must be at most 50 characters')
      .matches(/^[A-Za-z @&]+$/).withMessage('Role name can only contain letters, spaces, @ and &'),
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('status')
      .optional()
      .isBoolean().withMessage('Status must be a boolean'),
  ],
};

const roleParamValidation = [
  param('id').isMongoId().withMessage('Invalid role ID — must be a valid MongoDB ObjectId'),
];

const assignModuleRoleBodyRules = [
  body('userId')
    .notEmpty().withMessage('userId is required')
    .isMongoId().withMessage('userId must be a valid MongoDB ObjectId'),
  body('moduleKey')
    .optional()
    .isString().withMessage('moduleKey must be a string')
    .isLength({ min: 1, max: 64 }).withMessage('moduleKey length must be 1–64'),
  body('role')
    .notEmpty().withMessage('role is required')
    .isIn(['user', 'admin']).withMessage('role must be user or admin'),
];

const assignModuleRoleUserParam = [
  param('userId').isMongoId().withMessage('userId must be a valid MongoDB ObjectId'),
];

const userValidationRules = {
  create: [
    body('userName')
      .notEmpty().withMessage('User name is required')
      .isLength({ min: 3 }).withMessage('User name must be at least 3 characters')
      .isLength({ max: 100 }).withMessage('User name must be at most 100 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .customSanitizer((value) => normalizeUserEmail(value))
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .isLength({ max: 60 }).withMessage('Email must be at most 60 characters'),
    body('mobileNumber')
      .notEmpty().withMessage('Mobile number is required')
      .matches(/^[0-9]{10}$/).withMessage('Mobile number must be numeric and exactly 10 digits'),
    body('dob')
      .notEmpty().withMessage('Date of birth is required')
      .isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender')
      .notEmpty().withMessage('Gender is required')
      .isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('imageUrl')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value == null || value === '') return true;
        const s = String(value).trim();
        // Allow absolute URLs OR server-relative upload paths stored by this API
        // (e.g. "/public/uploads/users/user-123.jpg").
        if (/^https?:\/\//i.test(s)) return true;
        if (s.startsWith('/public/uploads/')) return true;
        if (s.startsWith('/uploads/')) return true; // legacy paths
        throw new Error('Image URL must be a valid URL');
      }),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .isLength({ max: 20 }).withMessage('Password must be at most 20 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])/)
      .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    body('roleId')
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId().withMessage('roleId must be a valid ObjectId'),
    body('departmentId')
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId().withMessage('departmentId must be a valid ObjectId'),
    body('status')
      .optional()
      .isBoolean().withMessage('Status must be a boolean'),
  ],
  update: [
    body('userName')
      .optional()
      .isLength({ min: 3 }).withMessage('User name must be at least 3 characters')
      .isLength({ max: 100 }).withMessage('User name must be at most 100 characters'),
    body('email')
      .optional()
      .trim()
      .customSanitizer((value) => {
        if (value === undefined || value === null || value === '') return value;
        return normalizeUserEmail(value);
      })
      .custom((value) => {
        if (value === undefined || value === null || value === '') return true;
        if (!validator.isEmail(value)) {
          throw new Error('Please enter a valid email address');
        }
        if (value.length > 60) {
          throw new Error('Email must be at most 60 characters');
        }
        return true;
      }),
    body('mobileNumber')
      .optional()
      .matches(/^[0-9]{10}$/).withMessage('Mobile number must be numeric and exactly 10 digits'),
    body('dob')
      .optional()
      .isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('imageUrl')
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => {
        if (value == null || value === '') return true;
        const s = String(value).trim();
        if (/^https?:\/\//i.test(s)) return true;
        if (s.startsWith('/public/uploads/')) return true;
        if (s.startsWith('/uploads/')) return true;
        throw new Error('Image URL must be a valid URL');
      }),
    body('password')
      .optional()
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .isLength({ max: 20 }).withMessage('Password must be at most 20 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])/)
      .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    body('roleId')
      .optional()
      .isMongoId().withMessage('roleId must be a valid ObjectId'),
    body('departmentId')
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId().withMessage('departmentId must be a valid ObjectId'),
    body('status')
      .optional()
      .isBoolean().withMessage('Status must be a boolean'),
  ],
};

const resourceAllocationValidationRules = {
  create: [
    body('projectId')
      .notEmpty().withMessage('Project is required')
      .isMongoId().withMessage('projectId must be a valid ObjectId'),
    body('departmentId')
      .notEmpty().withMessage('Department is required')
      .isMongoId().withMessage('departmentId must be a valid ObjectId'),
    body('resourceId')
      .notEmpty().withMessage('Resource is required')
      .isMongoId().withMessage('resourceId must be a valid ObjectId'),
    body('startDate')
      .notEmpty().withMessage('Start Date is required')
      .isISO8601().toDate().withMessage('Start Date must be a valid date'),
    body('endDate')
      .notEmpty().withMessage('End Date is required')
      .isISO8601().toDate().withMessage('End Date must be a valid date')
      .custom((value, { req }) => {
        if (new Date(value) < new Date(req.body.startDate)) {
          throw new Error('End Date must be on or after Start Date');
        }
        return true;
      }),
    body('allocationPercentage')
      .notEmpty().withMessage('Allocation Percentage is required')
      .isInt({ min: 0, max: 100 }).withMessage('Allocation Percentage must be between 0 and 100'),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['Active', 'Completed', 'On Hold']).withMessage('Status must be Active, Completed, or On Hold'),
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  ],
  update: [
    body('projectId')
      .optional()
      .isMongoId().withMessage('projectId must be a valid ObjectId'),
    body('departmentId')
      .optional()
      .isMongoId().withMessage('departmentId must be a valid ObjectId'),
    body('resourceId')
      .optional()
      .isMongoId().withMessage('resourceId must be a valid ObjectId'),
    body('startDate')
      .optional()
      .isISO8601().toDate().withMessage('Start Date must be a valid date'),
    body('endDate')
      .optional()
      .isISO8601().toDate().withMessage('End Date must be a valid date')
      .custom((value, { req }) => {
        if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
          throw new Error('End Date must be on or after Start Date');
        }
        return true;
      }),
    body('allocationPercentage')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('Allocation Percentage must be between 0 and 100'),
    body('status')
      .optional()
      .isIn(['Active', 'Completed', 'On Hold']).withMessage('Status must be Active, Completed, or On Hold'),
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  ],
};

// Export all validation rules in a single object
module.exports = {
  projectValidationRules,
  departmentValidationRules,
  roleValidationRules,
  roleParamValidation,
  assignModuleRoleBodyRules,
  assignModuleRoleUserParam,
  userValidationRules,
  resourceAllocationValidationRules,
  validate,
};
