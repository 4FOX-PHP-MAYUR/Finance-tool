const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Review Validation Schema
module.exports = (data) => {
  const reviewSchema = Joi.object({
    firstName: Joi.string()
      .required()
      .messages({ "any.required": msgConf.review.validation.firstName }),

    lastName: Joi.string()
      .required()
      .messages({ "any.required": msgConf.review.validation.lastName }),

    reviewDesc: Joi.string()
      .required()
      .messages({ "any.required": msgConf.review.validation.reviewDesc }),

    firstNameAr: Joi.string().allow("").optional().messages({
      "string.base": "First name arabic should be string",
    }),
    lastNameAr: Joi.string().allow("").optional().messages({
      "string.base": "Last name arabic should be string",
    }),

    ///Arabic String Fields
    reviewDescAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.review.validation.reviewDescAr,
    }),
  });
  return reviewSchema.validate(data);
};
