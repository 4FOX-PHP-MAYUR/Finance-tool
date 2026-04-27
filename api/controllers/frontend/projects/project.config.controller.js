const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const ProjectConfig = db.projectConfig;



exports.get = async (req, res) => {
  console.log("getAllProject");

  try {
      const isExists = await ProjectConfig.findOne();

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
    logger.error(`getAllProject${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.project.projectFetchFailed,
          res.statusCode
        )
      );
  }
};

exports.getById = async (req, res) => {
  try {
    const { configId } = req.params;
    if (!projectId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.project.validation.projectIdRequired, res.statusCode)
        );
    }
    const populateFields = [
      {
        path: "updatedBy createdBy",
        select: ["firstName", "lastName", "-roleId"],
      },
    ];
    const isExists = await ProjectConfig.findOne({
      _id: configId,
    }).populate(populateFields);

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${configId} ${msgConf.project.validation.projectIdNotFound}`,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.project.projectFound, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getBlogById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.project.projectNotFound, res.statusCode)
      );
  }
};


