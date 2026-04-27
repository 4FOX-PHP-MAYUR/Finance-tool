const Joi = require("joi");
const validator = require("validator");
const msgConf = require("../config/custom.messages.json");
const { normalizeUserEmail } = require("../utils/normalizeEmail");

///Auth Schema
module.exports = (data) => {
  const authSchema = Joi.object({
    email: Joi.string()
      .trim()
      .required()
      .custom((value, helpers) => {
        const n = normalizeUserEmail(value);
        if (!n) {
          return helpers.error("any.required");
        }
        if (!validator.isEmail(n)) {
          return helpers.error("string.email");
        }
        return n;
      })
      .messages({
        "string.email": msgConf.auth.validation.invalidEmail,
        "any.required": msgConf.auth.validation.emailIdRequired,
      }),
    password: Joi.string().required().messages({
      "any.required": msgConf.auth.validation.passwordRequired,
    }),
  });
  return authSchema.validate(data);
};
