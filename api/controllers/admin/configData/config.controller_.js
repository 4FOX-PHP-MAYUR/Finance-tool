const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
} = require("../../../startup/commonModules");
const { validateConfig } = require("../../../validations/admin.validation");
const logger = require("../../../startup/logging");
const {
  asyncMultiFileUploadMulter,
  deleteExistingFile,
} = require("../../common/helper");
const fs = require("fs");
const path = require("path");
const Config = db.config;

exports.add = async (req, res) => {
  try {
    await asyncMultiFileUploadMulter(req, res, "config");

    console.log("addConfig", req.body);
    const { error, value } = validateConfig(req.body);
    if (error) {
      return res
        .status(400)
        .json(c_error(error.details[0].message, res.statusCode));
    }

    // Map uploaded files to corresponding fields
    const fileFields = [
      "homeBannerImage",
      "ourBrandAmbassadorsSec1BannerImage",
      "ourBrandAmbassadorsLstCampImage",
    ];
    fileFields.forEach((field) => {
      if (req.files?.[field]?.[0]?.filename) {
        value[field] = req.files[field][0].filename;
      }
    });

    const data = await Config.create({
      ...value,
      updatedBy: req.user.userId,
      createdBy: req.user.userId,
    });
    if (!data) {
      return res
        .status(400)
        .json(c_error(msgConf.config.configCreationFailed, res.statusCode));
    }
    return res
      .status(201)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.config.configCreated, data),
          res.statusCode
        )
      );
  } catch (err) {
    console.log("err", err);
    logger.error(`addConfig ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.config.configCreationFailed,
          res.statusCode
        )
      );
  }
};
exports.update = async (req, res) => {
  try {
    await asyncMultiFileUploadMulter(req, res, "config");
    const { configId } = req.params;
    if (!configId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.config.validation.configIdRequired, res.statusCode)
        );
    }
    // Find the existing config
    const existingConfig = await Config.findById(configId);
    if (!existingConfig) {
      return res
        .status(404)
        .json(
          c_error(msgConf.config.validation.configIdNotFound, res.statusCode)
        );
    }
    console.log("updateConfig", req.body);
    console.log("updateConfigFiles", req.files);
    const updateFields = { ...req.body };
    if (req.files) {
      if (req.files.homeBannerImage && req.files.homeBannerImage[0]) {
        if (deleteExistingFile("config", existingConfig.homeBannerImage)) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.homeBannerImage = req.files.homeBannerImage[0].filename;
      }

      if (
        req.files.ourBrandAmbassadorsSec1BannerImage &&
        req.files.ourBrandAmbassadorsSec1BannerImage[0]
      ) {
        if (
          deleteExistingFile(
            "config",
            existingConfig.ourBrandAmbassadorsSec1BannerImage
          )
        ) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.ourBrandAmbassadorsSec1BannerImage =
          req.files.ourBrandAmbassadorsSec1BannerImage[0].filename;
      }

      if (
        req.files.ourBrandAmbassadorsLstCampImage &&
        req.files.ourBrandAmbassadorsLstCampImage[0]
      ) {
        if (
          deleteExistingFile(
            "config",
            existingConfig.ourBrandAmbassadorsLstCampImage
          )
        ) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.ourBrandAmbassadorsLstCampImage =
          req.files.ourBrandAmbassadorsLstCampImage[0].filename;
      }
    }

    console.log("updateFields", updateFields);

    /*    const fieldsToExclude = ["whatWeDoImage","blogBannerImage","footerLogo"];
           // Remove the fields from the update object
           fieldsToExclude.forEach(field => {
             delete updateFields[field];
           }); */

    const data = await Config.findByIdAndUpdate(configId, updateFields, {
      new: true,
    });
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(msgConf.config.validation.configIdNotFound, res.statusCode)
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.config.configUpdated, data),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`updateConfig ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.config.configUpdateFailed,
          res.statusCode
        )
      );
  }
};

exports.get = async (req, res) => {
  try {
    const isExists = await Config.findOne().sort({ updatedAt: -1 });

    if (!isExists) {
      return res
        .status(400)
        .json(c_error(`${msgConf.config.configFetchFailed}`, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.config.configFetchSuccess, isExists),
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
