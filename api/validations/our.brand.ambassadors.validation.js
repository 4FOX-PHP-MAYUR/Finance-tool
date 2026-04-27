const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///OurStory Schema
module.exports = (data) => {
  const ourBrandAmbassadorsSchema = Joi.object({
    name: Joi.string().required().messages({
      "any.required": msgConf.ourBrandAmbassadors.validation.name,
    }),
    nameAr: Joi.string().allow("").optional(),
    desc: Joi.string().allow("").optional(),
    descAr: Joi.string().allow("").optional(),
    image: Joi.string().allow("").optional(),
    mobImage: Joi.string().allow("").optional(),
    bgImage: Joi.string().allow("").optional(),
    sortOrder: Joi.string().allow("").optional(),
    
    campaign: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional(),
          titleAr: Joi.string().allow("").optional(),
          image: Joi.string().allow("").optional(),
          video: Joi.string().allow("").optional(),
          sortOrder: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.ourBrandAmbassadors.validation.campaign,
      }),
  });

  return ourBrandAmbassadorsSchema.validate(data);
};
