const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const mongoose = require("mongoose");

const Review = db.review;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const reviews = await Review.find(query);

    if (!reviews) {
      return res
        .status(400)
        .json(c_error(msgConf.review.reviewFetchFailed, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Review data", reviews),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getReviews ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.review.reviewFetchFailed, res.statusCode)
      );
  }
};
