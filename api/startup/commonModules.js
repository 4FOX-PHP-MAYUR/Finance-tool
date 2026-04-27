// commonModules.js

const { c_success, c_error, c_validate, c_results } = require("./customResponse");
const db = require('../models');
const logger = require("./logging");
const msgConf = require('../config/custom.messages.json')
module.exports = {
  c_success,
  c_error,
  c_validate,
  c_results,
  db,
  logger,
  msgConf
};
