const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///VisionMission Schema
module.exports = (data) => {
  const visionMissionSchema = Joi.object({
    vision: Joi.string().required().messages({
      "any.required": msgConf.visionMission.validation.vision,
    }),
    mission: Joi.string().required().messages({
      "any.required": msgConf.visionMission.validation.mission,
    }),
  });
  return visionMissionSchema.validate(data);
};
