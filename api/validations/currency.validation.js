const Joi = require("joi");
const msgConf = require("../config/custom.messages.json");

///Country Schema
module.exports = (data) => {
  const currencySchema = Joi.object({
  /*    amount: Joi.number().greater(0).messages({
      "number.base": "Amount must be a number",
      "number.greater": "Amount must be greater than 0",
    }), */

    base_code: Joi.string().trim().required().messages({
      "any.required": "Base currency is required",
      "string.empty": "Base currency cannot be empty",
    }),

    time_last_update_utc: Joi.string().required().messages({
      "any.required": "Date is required",
      "string.base": "Date must string",
    }),

    conversion_rates: Joi.object()
      .min(1)
      .pattern(
        Joi.string().min(3).max(3), // Currency codes like USD, EUR
        Joi.number()
      )
      .required()
      .messages({
        "any.required": "Rates are required",
        "object.min": "Rates must include at least one currency rate",
      }),
  });
  return currencySchema.validate(data);
};
