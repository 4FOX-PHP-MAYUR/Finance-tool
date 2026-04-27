const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Media Validation Schema
module.exports = (data) => {
  const mediaCategorySchema = Joi.object({
   category: Joi.string().required().messages({
    "any.required": msgConf.mediaCategory.validation.categoryRequired,
  }),
  categoryAr: Joi.string().allow("").optional().messages({
    "string.base": "Arabic category should be string only",
  }),
  });
  return mediaCategorySchema.validate(data);
};
