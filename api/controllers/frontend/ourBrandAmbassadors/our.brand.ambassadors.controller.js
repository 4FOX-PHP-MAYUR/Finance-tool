const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const OurBrandAmbassadors = db.ourBrandAmbassadors;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const ourBrandAmbassadors = await OurBrandAmbassadors.find(query);

    if (!ourBrandAmbassadors) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Our Brand Ambassadors data", ourBrandAmbassadors),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getOurBrandAmbassadors ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message ||
            msgConf.ourBrandAmbassadors.ourBrandAmbassadorsFetchFailed,
          res.statusCode
        )
      );
  }
};
