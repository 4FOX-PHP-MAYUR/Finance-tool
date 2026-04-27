const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

//Team Schema
module.exports = (data) => {
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
  return teamSchema.validate(data);
};
