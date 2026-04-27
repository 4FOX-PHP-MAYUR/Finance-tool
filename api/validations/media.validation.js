const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Media Validation Schema
module.exports = (data) => {
  const mediaSchema = Joi.object({
    mediaTitle: Joi.string()
      .required()
      .messages({ "any.required": msgConf.media.validation.mediaTitle }),

    ///Arabic String Fileds
    mediaTitleAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.media.validation.mediaTitleAr,
    }),
     publishedDate: Joi.string().allow("").optional().messages({
      "string.base": msgConf.media.validation.mediaTitleAr,
    }),
     mediaUrl: Joi.string().allow("").optional().messages({
      "string.base": msgConf.media.validation.mediaTitleAr,
    }),
    mediaUrlAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.media.validation.mediaTitleAr,
    }),
    
      category: Joi.string().required().messages({
    "any.required": msgConf.mediaCategory.validation.categoryRequired,
  }),
    isFeatured: Joi.boolean().optional(),
    sortOrder: Joi.string().allow("").optional(),
  });
  return mediaSchema.validate(data);
};

