const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const mongoose = require("mongoose");

const VisitUs = db.visitUs;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const visitUs = await VisitUs.find(query);

    if (!visitUs) {
      return res
        .status(400)
        .json(c_error(msgConf.visitUs.visitUsFetchFailed, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Visit us data", visitUs),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getVisitUs ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.visitUs.visitUsFetchFailed,
          res.statusCode
        )
      );
  }
};
