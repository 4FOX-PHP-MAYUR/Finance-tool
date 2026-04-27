const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const OurStory = db.ourStory;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const ourStory = await OurStory.find(query);

    if (!ourStory) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Our story data",  ourStory ),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getOurStory ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.ourStory.ourStoryFetchFailed,
          res.statusCode
        )
      );
  }
};
