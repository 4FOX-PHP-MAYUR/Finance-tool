const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

module.exports = (data) => {
  const { enquireUserSchema } = require("./enquire.user.validation");

  ///Project Enquire Schema
  const projectEnquireSchema = enquireUserSchema.concat(
    Joi.object({
      /* nationality: Joi.string()
        .required()
        .messages({ "any.required": msgConf.enquire.validation.nationality }), */
      noOfBedrooms: Joi.string()
        .required()
        .messages({ "any.required": msgConf.enquire.validation.noOfBedrooms }),
      projectID: Joi.string()
        .allow("") // Allow empty string
        .optional()
        .messages({ "string.base": msgConf.enquire.validation.projectID }),
      isAgreeCommunication: Joi.boolean().required().messages({
        "any.only": msgConf.enquire.validation.isAgree,
        "any.required": msgConf.enquire.validation.isAgreeRequired,
      }),
      isAgreeMarketing: Joi.boolean().optional()
      /* .messages({
        "any.only": msgConf.enquire.validation.isAgree,
        "any.required": msgConf.enquire.validation.isAgreeRequired,
      }), */

      
    })
  );
  return projectEnquireSchema.validate(data);
};
