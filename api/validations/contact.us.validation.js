const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

module.exports = (data) => {
  const { enquireUserSchema } = require("./enquire.user.validation");
  ///Contact Us Schema
  const contactUsSchema = enquireUserSchema.concat(
    Joi.object({
      message: Joi.string()
        .required()
        .messages({ "any.required": msgConf.contactUs.validation.message }),
    })
  );
  return contactUsSchema.validate(data);
};
