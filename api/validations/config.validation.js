const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Config Schema
module.exports = (data) => {
  const configSchema = Joi.object({
    //Home Page Config
    //homeBannerVideo: Joi.string().optional(),

    homeStoryTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeStoryTitle,
    }),

    homeStoryTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeStoryTitleAr,
    }),
    homeStoryDesc: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeStoryDesc,
    }),
    homeStoryDescAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeStoryDescAr,
    }),
    homeStoryUrl: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeStoryUrl,
    }),

    homeContactTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeContactTitle,
    }),
    homeContactTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeContactTitleAr,
    }),
    homeLagunaTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeLagunaTitle,
    }),
    homeLagunaTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeLagunaTitleAr,
    }),
    homeGatewayTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeGatewayTitle,
    }),
    homeGatewayTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeGatewayTitleAr,
    }),
    homeGatewayUrl: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.homeGatewayUrl,
    }),

    homeStory: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.title,
          }),
          titleAr: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.titleAr,
          }),
          description: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.description,
          }),
          descriptionAr: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.descriptionAr,
          }),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.config.validation.homeStory,
      }),

    /* homeFeatures: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.title,
          }),
          titleAr: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.titleAr,
          }),
          description: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.description,
          }),
          descriptionAr: Joi.string().allow("").optional().messages({
            "string.base": msgConf.config.validation.descriptionAr,
          }),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.config.validation.feature,
      }), */

    mediaTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.mediaTitle,
    }),
    mediaTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.mediaTitleAr,
    }),

    directorTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.directorTitle,
    }),
    directorTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.directorTitleAr,
    }),

    leadershipTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.leadershipTitle,
    }),
    leadershipTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.leadershipTitleAr,
    }),
    modernTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.modernTitle,
    }),
    modernTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.modernTitleAr,
    }),

    mortgageTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.mortgageTitle,
    }),
    mortgageTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.mortgageTitleAr,
    }),

    projectContactTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.projectContactTitle,
    }),
    projectContactTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.projectContactTitleAr,
    }),
     ambassadorTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.ambassadorTitle,
    }),
     ambassadorTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.ambassadorTitleAr,
    }),
      ambassadorSubTitle: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.ambassadorSubTitle,
    }),
     ambassadorSubTitleAr: Joi.string().optional().messages({
      "string.base": msgConf.config.validation.ambassadorSubTitleAr,
    }),
  })
    .required()
    .messages({
      "object.base": "The data must be an object.",
    });
  return configSchema.validate(data);
};
