const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");
const { validateContactUs } = require("../../../validations/admin.validation");
const { paginate } = require("../../common/helper");


const ContactUs = db.contactUs;

exports.add = async (req, res) => {
  try {
    const { error, value } = validateContactUs(req.body);
    if (error) {
      return res.status(400).json(c_error(error.details[0].message, 400));
    }

    const contactUsData = {
      ...value,
      updatedBy: req.user.userId,
      createdBy: req.user.userId,
    };

    
    

    const data = await ContactUs.create(contactUsData);
    if (!data) {
      return res
        .status(400)
        .json(c_error(msgConf.contactUs.contactUsSubmissionFailed, 400));
    }

    res
      .status(201)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.contactUs.contactUsSubmitted, data),
          201
        )
      );
  } catch (err) {
    logger.error(`addContactUs: ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.contactUs.contactUsSubmissionFailed, 500)
      );
  }
};

exports.get = async (req, res) => {
  try {
    const query = { isDeleted: false };
    const populateFields = ["createdBy", "updatedBy"];

    paginate({
      model: ContactUs,
      query: query,
      req: req,
      res: res,
      successMessage: msgConf.contactUs.contactUsFetchSuccess,
      errorMessage: msgConf.contactUs.contactUsFetchFailed,
      searchFields: ["firstName"],
    });
  } catch (err) {
    logger.error(`getAllContactUs ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.contactUs.contactUsFetchFailed,
          res.statusCode
        )
      );
  }
};

exports.getById = async (req, res) => {
  try {
    const { contactId } = req.params;
    if (!contactId) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.contactUs.validation.contactIdRequired,
            res.statusCode
          )
        );
    }
    const isExists = await ContactUs.findOne({
      _id: contactId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${contactId} ${msgConf.contactUs.validation.contactIdNotFound}`,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.contactUs.contactUsFound, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getContactUsById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.contactUs.contactIdNotFound,
          res.statusCode
        )
      );
  }
};

exports.delete = async (req, res) => {
  try {
    const { contactId } = req.params;
    if (!contactId) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.contactUs.validation.contactIdRequired,
            res.statusCode
          )
        );
    }
    const isExists = await ContactUs.findOne({
      _id: contactId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${contactId} ${msgConf.contactUs.validation.contactIdNotFound}`,
            res.statusCode
          )
        );
    }
    const data = await ContactUs.findByIdAndUpdate(
      contactId,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    console.log("data", data);
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.contactUs.validation.contactIdNotFound,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.contactUs.contactUsDeleted, data),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`deleteContactUs ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.contactUs.contactUsDeleteFailed,
          res.statusCode
        )
      );
  }
};

exports.activeInactive = async (req, res) => {
  try {
    const { contactId } = req.params;
    if (!contactId) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.contactUs.validation.contactIdRequired,
            res.statusCode
          )
        );
    }
    const isExists = await ContactUs.findOne({
      _id: contactId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${contactId} ${msgConf.contactUs.validation.contactIdNotFound}`,
            res.statusCode
          )
        );
    }
    const data = await ContactUs.findByIdAndUpdate(
      contactId,
      { isActive: !isExists.isActive },
      { new: true }
    );
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.contactUs.validation.contactIdNotFound,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(
            data.isActive
              ? msgConf.contactUs.contactUsActivated
              : msgConf.contactUs.contactUsDeactivated,
            data
          ),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`activeContactUs ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.contactUs.contactActivateDeactivateFailed,
          res.statusCode
        )
      );
  }
};
