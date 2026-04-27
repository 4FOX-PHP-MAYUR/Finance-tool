const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

const { location } = require("../models");
const { features } = require("process");

///Auth Schema
const authSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Ensures the string is a valid email address
    .required()
    .messages({
      "string.email": msgConf.auth.validation.invalidEmail,
      "any.required": msgConf.auth.validation.emailIdRequired,
    }),
  password: Joi.string().required().messages({
    "any.required": msgConf.auth.validation.passwordRequired,
  }),
});

const visionMissionSchema = Joi.object({
  vision: Joi.string().required().messages({
    "any.required": msgConf.visionMission.validation.vision,
  }),
  mission: Joi.string().required().messages({
    "any.required": msgConf.visionMission.validation.mission,
  }),
});

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
    .messages({ "any.required": msgConf.contentPages.validation.typeRequired }),

  //Arabic String Fileds
  //
});

// ///Enquire Schema
// const enquireTypeSchema = Joi.object({
//   enquireType: Joi.string()
//     .valid(...Object.values(EnquireType))
//     .required()
//     .messages({ "any.required": msgConf.contactUs.validation.enquireType }),
// });

///Enquire User Schema
const enquireUserSchema = Joi.object({
  firstName: Joi.string()
    .required()
    .messages({ "any.required": msgConf.contactUs.validation.firstName }),
  lastName: Joi.string()
    .required()
    .messages({ "any.required": msgConf.contactUs.validation.lastName }),
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Validates email format without restricting TLDs
    .required()
    .messages({
      "any.required": msgConf.contactUs.validation.email,
      "string.email": msgConf.contactUs.validation.invalidEmail, // Custom message for invalid email format
    }),
  mobile: Joi.string().allow("").optional().messages({
    "string.base": msgConf.contactUs.validation.mobileNoString,
  }),
  /*  mobile: Joi.string()
    .pattern(/^\+[1-9]\d{1,3}\d{6,14}$/)
    //.pattern(/^\d{10}$/) // Adjust this regex for different mobile formats, e.g., 10 digits
    .required()
    .messages({
      "any.required": msgConf.contactUs.validation.mobile,
      "string.pattern.base": msgConf.contactUs.validation.invalidMobile, // Custom message for invalid mobile format
    }), */
});

///Contact Us Schema
const contactUsSchema = enquireUserSchema.concat(
  Joi.object({
    message: Joi.string()
      .required()
      .messages({ "any.required": msgConf.contactUs.validation.message }),
  })
);

///Project Enquire Schema
const enquireSchema = enquireUserSchema.concat(
  Joi.object({
    nationality: Joi.string()
      .required()
      .messages({ "any.required": msgConf.enquire.validation.nationality }),
    noOfBedrooms: Joi.string()
      .required()
      .messages({ "any.required": msgConf.enquire.validation.noOfBedrooms }),
    projectID: Joi.string()
      .allow("") // Allow empty string
      .optional()
      .messages({ "string.base": msgConf.enquire.validation.projectID }),
    isAgree: Joi.boolean().required().messages({
      "any.only": msgConf.enquire.validation.isAgree,
      "any.required": msgConf.enquire.validation.isAgreeRequired,
    }),
  })
);

//Team Schema
const teamSchema = Joi.object({
  name: Joi.string()
    .required()
    .messages({ "any.required": msgConf.team.validation.name }),

  designation: Joi.string()
    .required()
    .messages({ "any.required": msgConf.team.validation.designation }),

  ///Arabic String Fileds
  nameAr: Joi.string().allow("").optional().messages({
    "string.base": msgConf.team.validation.nameAr,
  }),
  description: Joi.string().allow("").optional().messages({
    "string.base": msgConf.team.validation.descriptionString,
  }),
  designationAr: Joi.string().allow("").optional().messages({
    "string.base": msgConf.team.validation.designationAr,
  }),
  roles: Joi.array()
    .items(
      Joi.object({
        roleName: Joi.string().allow("").optional(),
        role: Joi.string().allow("").optional(),
        roleId: Joi.string().allow("").optional(),
      })
    )
    .optional()
    .messages({
      "array.base": "Roles must be an array.",
    }),
});

///Config Schema
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

  //Our Story
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
  //Our Development
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

  ourDevelopmentSection10Title: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.ourDevelopmentSection10Title,
  }),
  ourDevelopmentSection10TitleAr: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.ourDevelopmentSection10TitleAr,
  }),

  ourDevelopmentSection11Title: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.ourDevelopmentSection11Title,
  }),
  ourDevelopmentSection11TitleAr: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.ourDevelopmentSection11TitleAr,
  }),

  //Contact Us
  contactUsSection1Title: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.contactUsSection1Title,
  }),

  contactUsSection1TitleAr: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.contactUsSection1TitleAr,
  }),

  contactUsSection2Title: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.contactUsSection2Title,
  }),
  contactUsSection2TitleAr: Joi.string().optional().messages({
    "string.base": msgConf.config.validation.contactUsSection2TitleAr,
  }),
})
  .required()
  .messages({
    "object.base": "The data must be an object.",
  });

///OurStory Schema
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
  sec1BannerImage: Joi.string().allow("").optional(),

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
      })
    )
    .optional()
    .messages({
      "array.base": "cards must be an array.",
    }),

  isActive: Joi.boolean().optional(),
  isDeleted: Joi.boolean().optional(),
});

///Media Validation Schema
const mediaSchema = Joi.object({
  mediaTitle: Joi.string()
    .required()
    .messages({ "any.required": msgConf.media.validation.mediaTitle }),

  ///Arabic String Fileds
  mediaTitleAr: Joi.string().allow("").optional().messages({
    "string.base": msgConf.media.validation.mediaTitleAr,
  }),
});

///Review Validation Schema
const reviewSchema = Joi.object({
  firstName: Joi.string()
    .required()
    .messages({ "any.required": msgConf.review.validation.firstName }),

  lastName: Joi.string()
    .required()
    .messages({ "any.required": msgConf.review.validation.lastName }),

  reviewDesc: Joi.string()
    .required()
    .messages({ "any.required": msgConf.review.validation.reviewDesc }),

  firstNameAr: Joi.string().allow("").optional().messages({
    "string.base": "First name arabic should be string",
  }),
  lastNameAr: Joi.string().allow("").optional().messages({
    "string.base": "Last name arabic should be string",
  }),

  ///Arabic String Fileds
  reviewDescAr: Joi.string().allow("").optional().messages({
    "string.base": msgConf.review.validation.reviewDescAr,
  }),
});

///Subscription Schema
const subscriptionSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Ensures the string is a valid email address
    .required()
    .messages({
      "string.email": msgConf.auth.validation.invalidEmail,
      "any.required": msgConf.auth.validation.emailIdRequired,
    }),
});

///Project Schema
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

  projectVideo: Joi.string().allow("").optional(),
  projectVideoTitle: Joi.string().allow("").optional(),
  projectVideoTitleAr: Joi.string().allow("").optional().messages({
    "string.base": msgConf.project.validation.projectVideoTitleAr,
  }),
  projectDes: Joi.string().allow("").optional(),
  projectDesAr: Joi.string().allow("").optional().messages({
    "string.base": msgConf.project.validation.projectDesAr,
  }),
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

  brochure: Joi.string().allow("").optional(),
  virtualTourUrl: Joi.string().allow("").optional(),
});

///Project Building Schema
const buildingSchema = Joi.object({
  buildingNo: Joi.string().allow("").optional(),
  buildingName: Joi.string().allow("").optional(),
  buildingNameAr: Joi.string().allow("").optional(),
  buildingImage: Joi.string().allow("").optional(),
  projectId: Joi.string().required().messages({
    "any.required": msgConf.building.validation.projectIdRequired,
  }),
});

///Project Floor Schema
const floorSchema = Joi.object({
  buildingId: Joi.string()
    .required()
    .messages({ "any.required": msgConf.floor.validation.buildingIdRequired }),
  projectId: Joi.string()
    .required()
    .messages({ "any.required": msgConf.floor.validation.projectIdRequired }),

  floorNo: Joi.string().allow("").optional(),
  floorName: Joi.string().allow("").optional(),
  floorImage: Joi.string().allow("").optional(),
});

///Country Schema
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

///Footer Schema
const footerSchema = Joi.object({
  email: Joi.string().allow("").optional().messages({
    "string.base": msgConf.footer.validation.email,
  }),
  phone: Joi.string().allow("").optional().messages({
    "string.base": msgConf.footer.validation.phone,
  }),

  copyRights: Joi.string().allow("").optional().messages({
    "string.base": msgConf.footer.validation.copyRights,
  }),

  socialLinks: Joi.array()
    .items(
      Joi.object({
        socialLink: Joi.string().allow("").optional().messages({
          "string.base": msgConf.footer.validation.socialLink,
        }),
      })
    )
    .optional()
    .messages({
      "array.base": msgConf.footer.validation.socialLinks,
    }),

  footerAddress: Joi.array()
    .items(
      Joi.object({
        city: Joi.string().allow("").optional().messages({
          "string.base": msgConf.footer.validation.city,
        }),

        cityAr: Joi.string().allow("").optional().messages({
          "string.base": msgConf.footer.validation.cityAr,
        }),

        address: Joi.string().allow("").optional().messages({
          "string.base": msgConf.footer.validation.address,
        }),
        addressAr: Joi.string().allow("").optional().messages({
          "string.base": msgConf.footer.validation.addressAr,
        }),
        phone: Joi.string().allow("").optional().messages({
          "string.base": msgConf.footer.validation.phone,
        }),
      })
    )
    .optional()
    .messages({
      "array.base": msgConf.footer.validation.footerAddress,
    }),
});

module.exports = {
  validateUser: (data) => authSchema.validate(data),
  validateContentPage: (data) => contentPageSchema.validate(data),
  validateVisionMission: (data) => visionMissionSchema.validate(data),
  validateContactUs: (data) => contactUsSchema.validate(data),
  validateEnquire: (data) => enquireSchema.validate(data),
  //validateEnquireType: (data) => enquireTypeSchema.validate(data),
  validateTeam: (data) => teamSchema.validate(data),
  validateConfig: (data) => configSchema.validate(data),
  validateOurStory: (data) => ourStorySchema.validate(data),
  validateMedia: (data) => mediaSchema.validate(data),
  validateReview: (data) => reviewSchema.validate(data),
  validateSubscription: (data) => subscriptionSchema.validate(data),
  validateProject: (data) => projectSchema.validate(data),
  validateBuilding: (data) => buildingSchema.validate(data),
  validateFloor: (data) => floorSchema.validate(data),
  validateCountry: (data) => countrySchema.validate(data),
  validateFooter: (data) => footerSchema.validate(data),
};
