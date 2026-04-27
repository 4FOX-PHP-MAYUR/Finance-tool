const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Country Schema
module.exports = (data) => {
  const projectCountrySchema = Joi.object({
    countryName: Joi.string()
      .required()
      .messages({ "any.required": msgConf.projectCountry.validation.projectCountryName }),
    countryNameAr: Joi.string()
      .allow("") // Allow empty string
      .optional()
      .messages({ "string.base": msgConf.projectCountry.validation.projectCountryNameAr }),

    sortOrder: Joi.number()
      .allow("")
      .empty("")
      .optional()
  });
  return projectCountrySchema.validate(data);
};
