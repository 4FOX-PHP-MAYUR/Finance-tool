const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///campaign Schema
module.exports = (data) => {
  const campaignSchema = Joi.object({
    title: Joi.string().required().messages({
      "any.required": msgConf.campaign.validation.title,
    }),
    titleAr: Joi.string().allow("").optional(),
    campaign: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional(),
          titleAr: Joi.string().allow("").optional(),
          image: Joi.string().allow("").optional(),
          video: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.ourBrandAmbassadors.validation.campaign,
      }),
    sortOrder: Joi.string().allow("").optional(),
    isActive: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional(),
  });

  return campaignSchema.validate(data);
};
