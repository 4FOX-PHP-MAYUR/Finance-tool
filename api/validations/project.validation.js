const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Project Schema
module.exports = (data) => {
  const projectSchema = Joi.object({
    projectTitle: Joi.string()
      .required()
      .messages({ "any.required": msgConf.project.validation.projectTitle }),

    projectTitleAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.project.validation.projectTitleAr,
    }),
    city: Joi.string().allow("").optional(),

    cityAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.project.validation.cityAr,
    }),

    price: Joi.string().allow("").optional(),

    variations: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional(),
          titleAr: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.project.validation.variations,
      }),
    bathroom: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().allow("").optional(),
          titleAr: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.project.validation.variations,
      }),



    projectVideo: Joi.string().allow("").optional(),
    projectVideoTitle: Joi.string().allow("").optional(),
    projectVideoTitleAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.project.validation.projectVideoTitleAr,
    }),
    projectDes: Joi.string().allow("").optional(),
    projectDesAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.project.validation.projectDesAr,
    }),

    projectDesMob: Joi.string().allow("").optional(),
    projectDesMobAr: Joi.string().allow("").optional(),
    latitude: Joi.string().allow("").optional(),
    longitude: Joi.string().allow("").optional(),
    address: Joi.string().allow("").optional(),
    nearBy: Joi.array()
      .items(
        Joi.object({
          time: Joi.string().allow("").optional(),
          timeAr: Joi.string().allow("").optional(),
          locationName: Joi.string().allow("").optional(),
          locationNameAr: Joi.string().allow("").optional(),
          image: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.project.validation.nearBy,
      }),

    amenities: Joi.array()
      .items(
        Joi.object({
          image: Joi.string().allow("").optional(),
          title: Joi.string().allow("").optional(),
          titleAr: Joi.string().allow("").optional(),
          description: Joi.string().allow("").optional(),
          descriptionAr: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.project.validation.amenities,
      }),

    gallery: Joi.array()
      .items(
        Joi.object({
          image: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.project.validation.amenities,
      }),
    propertyImages: Joi.array()
      .items(
        Joi.object({
          image: Joi.string().allow("").optional(),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.project.validation.amenities,
      }),

    brochure: Joi.string().allow("").optional(),
    virtualTourUrl: Joi.string().allow("").optional(),

    topNotchTitle: Joi.string().allow("").optional(),
    topNotchTitleAr: Joi.string().allow("").optional(),
    topNotchDescription: Joi.string().allow("").optional(),
    topNotchDescriptionAr: Joi.string().allow("").optional(),
    topNotchDescriptionMob: Joi.string().allow("").optional(),
    topNotchDescriptionMobAr: Joi.string().allow("").optional(),
    topNotchImage: Joi.string().allow("").optional(),
    experienceTitle: Joi.string().allow("").optional(),
    experienceTitleAr: Joi.string().allow("").optional(),
    projectImage: Joi.string().allow("").optional(),
    projectUrl: Joi.string().allow("").optional(),
    projectCountryId: Joi.string().allow("").optional(),

    propertyType: Joi.string().allow("").optional(),

    propertyTypeAr: Joi.string().allow("").optional(),
    area: Joi.string().allow("").optional(),
    areaAr: Joi.string().allow("").optional(),
    sqft: Joi.string().allow("").optional(),
    sortOrder: Joi.string().allow("").optional(),
    propertyTypes: Joi.string().allow("").optional(),
noOfBedrooms: Joi.array()
  .optional()
  .messages({
    "array.base": "noOfBedrooms must be an array.",
  }),
  noOfWashrooms: Joi.array()
  .optional()
  .messages({
    "array.base": "noOfWashrooms must be an array.",
  }),

    




  });
  return projectSchema.validate(data);
};
