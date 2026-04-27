const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const Flat = db.flat;

exports.getFlatById = async (req, res) => {
  try {
    const { flatId } = req.params;
    if (!flatId) {
      return res
        .status(400)
        .json(c_error(msgConf.flat.validation.flatIdRequired, res.statusCode));
    }
    const isExists = await Flat.findOne({
      _id: flatId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${flatId} ${msgConf.flat.validation.flatIdNotFound}`,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.flat.flatFound, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getFlatById ${err.message}`);
    res
      .status(500)
      .json(c_error(err.message || msgConf.flat.flatNotFound, res.statusCode));
  }
};
