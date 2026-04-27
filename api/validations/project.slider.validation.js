const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Project Floor Schema
module.exports = (data) => {
  const projectSliderSchema = Joi.object({
    // projectId: Joi.string()
    //   .required()
    //   .messages({ "any.required": msgConf.floor.validation.projectIdRequired }),
    projectId: Joi.string().allow("").optional(),
    projectSliderTitle: Joi.string().required().messages({
      "any.required": msgConf.projectSlider.validation.projectSliderTitle,
    }),
    projectSliderTitleAr: Joi.string().allow("").optional().messages({
      "string.base": msgConf.projectSlider.validation.projectSliderTitleAr,
    }),
    projectSliderImage: Joi.string().allow("").optional(),
    projectSliderMobImage: Joi.string().allow("").optional(),
    projectSliderUrl: Joi.string().allow("").optional(),
  });

  return projectSliderSchema.validate(data);
};
