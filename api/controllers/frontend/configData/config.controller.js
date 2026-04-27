const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
} = require("../../../startup/commonModules");
const { validateConfig } = require("../../../validations/admin.validation");
const logger = require("../../../startup/logging");
const { paginate, asyncMultiFileUploadMulter } = require("../../common/helper");
const Config = db.config;

exports.getConfig = async (req, res) => {
  try {
    const configData = await Config.findOne().sort({ updatedAt: -1 }).lean();
    const bedroomVariants = {
      variants: [
        {
          name: "Studio",
          value: "studio"
        },
        {
          name: "1 Bedroom",
          value: "1"
        },
        {
          name: "2 Bedroom",
          value: "2"
        },
        {
          name: "3 Bedroom",
          value: "3"
        }
      ],
      variantsAr: [
        {
          name: "استوديو",
          value: "1"
        },
        {
          name:"غرفة",
          value: "2"
        },
        {
          name: "غرفتان",
          value: "3"
        },
        {
          name: "3 غرف",
          value: "4"
        }
      ]

    }

    

    if (!configData) {
      return res
        .status(400)
        .json(c_error(`${msgConf.config.configFetchFailed}`, res.statusCode));
    }

    configData.bedroomVariants = bedroomVariants;

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.config.configFetchSuccess, configData),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getConfig ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.config.configFetchFailed, res.statusCode)
      );
  }
};
