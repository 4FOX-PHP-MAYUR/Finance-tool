const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const Campaign = db.campaign;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const campaign = await Campaign.find(query);

    if (!campaign) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("campaign data", campaign),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`get campaign ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.campaign.campaignFetchFailed,
          res.statusCode
        )
      );
  }
};
