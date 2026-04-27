const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Enquire User Schema
exports.enquireUserSchema = Joi.object({
  firstName: Joi.string()
    .required()
    .messages({ "any.required": msgConf.contactUs.validation.firstName }),
  lastName: Joi.string()
    .required()
    .messages({ "any.required": msgConf.contactUs.validation.lastName }),
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Validates email format without restricting TLDs
    .required()
    .messages({
      "any.required": msgConf.contactUs.validation.email,
      "string.email": msgConf.contactUs.validation.invalidEmail, // Custom message for invalid email format
    }),
  mobile: Joi.string().allow("").optional().messages({
    "string.base": msgConf.contactUs.validation.mobileNoString,
  }),
  /*  mobile: Joi.string()
    .pattern(/^\+[1-9]\d{1,3}\d{6,14}$/)
    //.pattern(/^\d{10}$/) // Adjust this regex for different mobile formats, e.g., 10 digits
    .required()
    .messages({
      "any.required": msgConf.contactUs.validation.mobile,
      "string.pattern.base": msgConf.contactUs.validation.invalidMobile, // Custom message for invalid mobile format
    }), */
});

exports.validateEnquireUserSchema = (data) => {
  return enquireUserSchema.validate(data);
};
