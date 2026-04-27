const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///OurStory Schema
module.exports = (data) => {
  const ourStorySchema = Joi.object({
    sec1Title: Joi.string()
      .required()
      .messages({ "any.required": msgConf.ourStory.validation.sec1Title }),

    sec2Title: Joi.string()
      .required()
      .messages({ "any.required": msgConf.ourStory.validation.sec2Title }),

    sec3Title: Joi.string()
      .required()
      .messages({ "any.required": msgConf.ourStory.validation.sec3Title }),

    sec3SubTitle: Joi.string()
      .required()
      .messages({ "any.required": msgConf.ourStory.validation.sec3SubTitle }),

    sec1TitleAr: Joi.string().allow("").optional(),
    sec1Description: Joi.string().allow("").optional(),
    sec1DescriptionAr: Joi.string().allow("").optional(),
    sec1DescriptionMob: Joi.string().allow("").optional(),
    sec1DescriptionMobAr: Joi.string().allow("").optional(),
    sec1BannerImage: Joi.string().allow("").optional(),
    sec1MobImage: Joi.string().allow("").optional(),
    sec2TitleAr: Joi.string().allow("").optional(),
    sec2Description: Joi.string().allow("").optional(),
    sec2DescriptionAr: Joi.string().allow("").optional(),
    sec2BannerImage: Joi.string().allow("").optional(),

    sec3TitleAr: Joi.string().allow("").optional(),
    sec3SubTitleAr: Joi.string().allow("").optional(),
    sec3Description: Joi.string().allow("").optional(),
    sec3DescriptionAr: Joi.string().allow("").optional(),
    sec3BannerImage: Joi.string().allow("").optional(),

    cards: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional(),
          titleAr: Joi.string().allow("").optional(),
          subTitle: Joi.string().allow("").optional(),
          subTitleAr: Joi.string().allow("").optional(),
          image: Joi.string().allow("").optional(),
          description: Joi.string().allow("").optional(),
          descriptionAr: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.ourStory.validation.cards,
      }),

    backedByTitle: Joi.string().allow("").optional(),
    backedByTitleAr: Joi.string().allow("").optional(),
    backedBySubTitle: Joi.string().allow("").optional(),
    backedBySubTitleAr: Joi.string().allow("").optional(),
    backedBy: Joi.array()
      .items(
        Joi.object({
          logoImage: Joi.string().allow("").optional(),
          description: Joi.string().allow("").optional(),
          descriptionAr: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.ourStory.validation.backedBy,
      }),

    isActive: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional(),
  });

  return ourStorySchema.validate(data);
};
