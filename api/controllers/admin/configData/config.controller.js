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
    const fileFields = ["homeBannerVideo","homeBannerVideoAr","homeBannerVideoMob", "homeLagunaImage","homeBannerVideoMobAr"];
    fileFields.forEach((field) => {
      if (req.files?.[field]?.[0]?.filename) {
        value[field] = req.files[field][0].filename;
      }
    });

    let homeStory = [];
    if (value.homeStory && value.homeStory.length > 0) {
      for (let i = 0; i < value.homeStory.length; i++) {
        const homeStoryItem = value.homeStory[i];
        homeStory.push({
          image:
            req.files[`homeStory[${i}][image]`]?.[0]?.filename ||
            homeStoryItem.image,
            imageAr:
            req.files[`homeStory[${i}][imageAr]`]?.[0]?.filename ||
            homeStoryItem.imageAr,
          title: homeStoryItem?.title,
          titleAr: homeStoryItem?.titleAr,
          description: homeStoryItem?.description,
          descriptionAr: homeStoryItem?.homeStoryItemAr,
        });
      }
    }
    value.homeStory = homeStory;

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
      if (req.files.homeBannerVideo && req.files.homeBannerVideo[0]) {
        if (deleteExistingFile("config", existingConfig.homeBannerVideo)) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.homeBannerVideo = req.files.homeBannerVideo[0].filename;
      }

      if (req.files.homeBannerVideoAr && req.files.homeBannerVideoAr[0]) {
        if (deleteExistingFile("config", existingConfig.homeBannerVideoAr)) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.homeBannerVideoAr = req.files.homeBannerVideoAr[0].filename;
      }

      if (req.files.homeBannerVideoMob && req.files.homeBannerVideoMob[0]) {
        if (deleteExistingFile("config", existingConfig.homeBannerVideoMob)) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.homeBannerVideoMob = req.files.homeBannerVideoMob[0].filename;
      }
      if (req.files.homeBannerVideoMobAr && req.files.homeBannerVideoMobAr[0]) {
        if (deleteExistingFile("config", existingConfig.homeBannerVideoMobAr)) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.homeBannerVideoMobAr = req.files.homeBannerVideoMobAr[0].filename;
      }

      

      

      if (req.files.homeLagunaImage && req.files.homeLagunaImage[0]) {
        if (deleteExistingFile("config", existingConfig.homeLagunaImage)) {
          console.log("File deleted successfully");
        } else {
          console.log("File is not deleted");
        }
        updateFields.homeLagunaImage = req.files.homeLagunaImage[0].filename;
      }
    }

    if (updateFields.homeStory && updateFields.homeStory.length > 0) {
      let homeStory = [];
      for (let i = 0; i < updateFields.homeStory.length; i++) {
        const homeStoryItem = updateFields.homeStory[i];
        homeStory.push({
          image:
            req.files[`homeStory[${i}][image]`]?.[0]?.filename ||
            homeStoryItem.image,
            imageAr:
            req.files[`homeStory[${i}][imageAr]`]?.[0]?.filename ||
            homeStoryItem.imageAr,
          title: homeStoryItem?.title,
          titleAr: homeStoryItem?.titleAr,
          description: homeStoryItem?.description,
          descriptionAr: homeStoryItem?.descriptionAr,
        });
      }
      updateFields.homeStory = homeStory;
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


exports.uploadTest = async (req, res) => {
  try {
    await asyncMultiFileUploadMulter(req, res, "test");

    // Map uploaded files to corresponding fields
    const fileFields = ["testFile"];
    let fileName = null;
    fileFields.forEach((field) => {
      if (req.files?.[field]?.[0]?.filename) {
        fileName = req.files[field][0].filename;
      }
    });

    
    return res
      .status(201)
      .json(
        c_success(
          msgConf.success,
          c_results("File uploaded suceesfully", fileName),
          res.statusCode
        )
      );
  } catch (err) {
    console.log("err", err);
    res
      .status(500)
      .json(
        c_error(
          err,
          res.statusCode
        )
      );
  }
};
