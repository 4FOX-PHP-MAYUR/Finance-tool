const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Footer Schema
module.exports = (data) => {
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
    copyRightsAr: Joi.string().allow("").optional().messages({
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
          addressUrl: Joi.string().allow("").optional().messages({
      "string.base": msgConf.footer.validation.addressUrl,
    }),
        })
      )
      .optional()
      .messages({
        "array.base": msgConf.footer.validation.footerAddress,
      }),

    reachUsTitle: Joi.string().allow("").optional().messages({
      "string.base": msgConf.footer.validation.reachUsTitle,
    }),
    reachUsTitleAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.footer.validation.reachUsTitleAr,
    }),
    ourOfficeTitle: Joi.string().allow("").optional().messages({
      "string.base": msgConf.footer.validation.ourOfficeTitle,
    }),
    ourOfficeTitleAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.footer.validation.ourOfficeTitleAr,
    }),
    
  });
  return footerSchema.validate(data);
};
