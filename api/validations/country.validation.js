const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Country Schema
module.exports = (data) => {
  const countrySchema = Joi.object({
    countryName: Joi.string()
      .required()
      .messages({ "any.required": msgConf.country.validation.countryName }),
    countryCode: Joi.string()
      .required()
      .messages({ "any.required": msgConf.country.validation.countryCode }),
    shortCode: Joi.string()
      .allow("") // Allow empty string
      .optional()
      .messages({ "string.base": msgConf.country.validation.shortCode }),
  });
  return countrySchema.validate(data);
};
