const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Project Building Schema
module.exports = (data) => {
  const buildingSchema = Joi.object({
    buildingNo: Joi.string().allow("").optional(),
    buildingName: Joi.string().allow("").optional(),
    buildingNameAr: Joi.string().allow("").optional(),
    buildingImage: Joi.string().allow("").optional(),
    projectId: Joi.string().required().messages({
      "any.required": msgConf.building.validation.projectIdRequired,
    }),
  });
  return buildingSchema.validate(data);
};
