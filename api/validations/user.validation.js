const Joi = require('joi');
const validator = require('validator');
const msgConf = require('../config/custom.messages.json');
const { normalizeUserEmail } = require('../utils/normalizeEmail');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]/;
const mobilePattern = /^[0-9]{10}$/;

const createUserSchema = Joi.object({
  userName: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min':    msgConf.users.validation.userNameMin,
      'string.max':    msgConf.users.validation.userNameMax,
      'any.required':  msgConf.users.validation.userNameRequired,
      'string.empty':  msgConf.users.validation.userNameRequired,
    }),

  email: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      const n = normalizeUserEmail(value);
      if (!n) {
        return helpers.error('any.required');
      }
      if (n.length > 60) {
        return helpers.error('string.max', { limit: 60 });
      }
      if (!validator.isEmail(n)) {
        return helpers.error('string.email');
      }
      return n;
    })
    .messages({
      'string.email':  msgConf.users.validation.emailInvalid,
      'string.max':    msgConf.users.validation.emailMax,
      'any.required':  msgConf.users.validation.emailRequired,
      'string.empty':  msgConf.users.validation.emailRequired,
    }),

  mobileNumber: Joi.string()
    .pattern(mobilePattern)
    .required()
    .messages({
      'string.pattern.base': msgConf.users.validation.mobileNumberInvalid,
      'any.required':        msgConf.users.validation.mobileNumberRequired,
      'string.empty':        msgConf.users.validation.mobileNumberRequired,
    }),

  dob: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base':    msgConf.users.validation.dobInvalid,
      'date.format':  msgConf.users.validation.dobInvalid,
      'any.required': msgConf.users.validation.dobRequired,
    }),

  gender: Joi.string()
    .valid('male', 'female', 'other')
    .required()
    .messages({
      'any.only':     msgConf.users.validation.genderInvalid,
      'any.required': msgConf.users.validation.genderRequired,
      'string.empty': msgConf.users.validation.genderRequired,
    }),

  imageUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': msgConf.users.validation.imageUrlInvalid,
    }),

  password: Joi.string()
    .min(8)
    .max(20)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.min':          msgConf.users.validation.passwordMin,
      'string.max':          msgConf.users.validation.passwordMax,
      'string.pattern.base': msgConf.users.validation.passwordWeak,
      'any.required':        msgConf.users.validation.passwordRequired,
      'string.empty':        msgConf.users.validation.passwordRequired,
    }),

  roleId: Joi.alternatives()
    .try(
      Joi.string().valid('', null),
      Joi.string().pattern(objectIdPattern).messages({
        'string.pattern.base': msgConf.users.validation.roleIdInvalid,
      })
    )
    .optional(),

  status: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
  userName: Joi.string()
    .min(3)
    .max(100)
    .messages({
      'string.min': msgConf.users.validation.userNameMin,
      'string.max': msgConf.users.validation.userNameMax,
    }),

  email: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (value === undefined || value === null || value === '') {
        return value;
      }
      const n = normalizeUserEmail(value);
      if (!n) {
        return helpers.error('string.empty');
      }
      if (n.length > 60) {
        return helpers.error('string.max', { limit: 60 });
      }
      if (!validator.isEmail(n)) {
        return helpers.error('string.email');
      }
      return n;
    })
    .messages({
      'string.email': msgConf.users.validation.emailInvalid,
      'string.max':   msgConf.users.validation.emailMax,
      'string.empty': msgConf.users.validation.emailRequired,
    }),

  mobileNumber: Joi.string()
    .pattern(mobilePattern)
    .messages({
      'string.pattern.base': msgConf.users.validation.mobileNumberInvalid,
    }),

  dob: Joi.date()
    .iso()
    .messages({
      'date.base':   msgConf.users.validation.dobInvalid,
      'date.format': msgConf.users.validation.dobInvalid,
    }),

  gender: Joi.string()
    .valid('male', 'female', 'other')
    .messages({
      'any.only': msgConf.users.validation.genderInvalid,
    }),

  imageUrl: Joi.string()
    .uri()
    .optional()
    .allow('', null)
    .messages({
      'string.uri': msgConf.users.validation.imageUrlInvalid,
    }),

  password: Joi.string()
    .min(8)
    .max(20)
    .pattern(passwordPattern)
    .messages({
      'string.min':          msgConf.users.validation.passwordMin,
      'string.max':          msgConf.users.validation.passwordMax,
      'string.pattern.base': msgConf.users.validation.passwordWeak,
    }),

  roleId: Joi.string()
    .pattern(objectIdPattern)
    .messages({
      'string.pattern.base': msgConf.users.validation.roleIdInvalid,
    }),

  status: Joi.boolean(),
}).min(1);  // at least one field must be provided on update

module.exports = { createUserSchema, updateUserSchema };