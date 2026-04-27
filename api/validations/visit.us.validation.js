const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Visit Us Validation Schema
module.exports = (data) => {
  const visitUsSchema = Joi.object({
    locationName: Joi.string()
      .required()
      .messages({ "any.required": msgConf.visitUs.validation.locationName1 }),

    locationNameAr: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.locationName1Ar,
    // }),

    locationAddress: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.locationAddress1,
    // }),

    locationAddressAr: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.locationAddress1Ar,
    // }),

    
    visitUsUrl: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.visitUsGoogleMapUrl,
    // }),

    mobileNo1: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.mobileNo1,
    // }),

    mobileNo2: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.mobileNo1,
    // }),

    emailAddress: Joi.string().allow("").optional(),
    // .messages({
    //   "string.base": msgConf.visitUs.validation.email,
    // }),
  });
  return visitUsSchema.validate(data);
};
