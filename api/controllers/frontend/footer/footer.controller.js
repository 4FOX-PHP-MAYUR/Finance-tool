const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const Footer = db.footer;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    //const footer = await Footer.find(query);
    const footer = await Footer.findOne().sort({ updatedAt: -1 });

    if (!footer) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Footer data", footer),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getFooter ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.footer.mediaFetchFailed, res.statusCode)
      );
  }
};
