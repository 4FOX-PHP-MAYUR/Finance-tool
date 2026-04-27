const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Project Floor Schema
module.exports = (data) => {
  const flatSchema = Joi.object({
    buildingId: Joi.string().required().messages({
      "any.required": msgConf.flat.validation.buildingIdRequired,
    }),
    projectId: Joi.string()
      .required()
      .messages({ "any.required": msgConf.flat.validation.projectIdRequired }),
    floorId: Joi.string()
      .required()
      .messages({ "any.required": msgConf.flat.validation.floorIdRequired }),
    flatNo: Joi.string().allow("").optional(),
    thumbnailImage: Joi.string().allow("").optional(),
    flatImage: Joi.string().allow("").optional(),
    noOfRooms: Joi.string().allow("").optional(),
    noOfUnits: Joi.array().optional(),
    suitArea: Joi.string().allow("").optional(),
    balconyArea: Joi.string().allow("").optional(),
    totalArea: Joi.string().allow("").optional(),
  });

  return flatSchema.validate(data);
};
