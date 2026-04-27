const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

module.exports = (data) => {
  ///Content Pages Schema
  const contentPageSchema = Joi.object({
    title: Joi.string().required().messages({
      "any.required": msgConf.contentPages.validation.titleRequired,
    }),
    description: Joi.string().required().messages({
      "any.required": msgConf.contentPages.validation.descriptionRequired,
    }),
    type: Joi.string()
      .required()
      .messages({
        "any.required": msgConf.contentPages.validation.typeRequired,
      }),
  });
  return contentPageSchema.validate(data);
};
