const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Subscription Schema
module.exports = (data) => {
  const subscriptionSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } }) // Ensures the string is a valid email address
      .required()
      .messages({
        "string.email": msgConf.auth.validation.invalidEmail,
        "any.required": msgConf.auth.validation.emailIdRequired,
      }),
  });
  return subscriptionSchema.validate(data);
};
