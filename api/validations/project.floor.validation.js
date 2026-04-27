const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Project Floor Schema
module.exports = (data) => {
  const floorSchema = Joi.object({
    buildingId: Joi.string()
      .required()
      .messages({
        "any.required": msgConf.floor.validation.buildingIdRequired,
      }),
    projectId: Joi.string()
      .required()
      .messages({ "any.required": msgConf.floor.validation.projectIdRequired }),

    floorNo: Joi.string().allow("").optional(),
    floorName: Joi.string().allow("").optional(),
    floorImage: Joi.string().allow("").optional(),
  });

  return floorSchema.validate(data);
};
