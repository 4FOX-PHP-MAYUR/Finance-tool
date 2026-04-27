const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");
const { validateEnquire } = require("../../../validations/admin.validation");
const { paginate } = require("../../common/helper");


const Enquire = db.enquire;

exports.add = async (req, res) => {
  try {
    const { error, value } = validateEnquire(req.body);
    if (error) {
      return res.status(400).json(c_error(error.details[0].message, 400));
    }

    const enquireData = {
      ...value,
      updatedBy: req.user.userId,
      createdBy: req.user.userId,
    };

    

    const data = await Enquire.create(enquireData);
    if (!data) {
      return res
        .status(400)
        .json(c_error(msgConf.enquire.enquireSubmissionFailed, 400));
    }

    res
      .status(201)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.enquire.enquireSubmitted, data),
          201
        )
      );
  } catch (err) {
    logger.error(`addEnquire: ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.enquire.enquireSubmissionFailed, 500)
      );
  }
};

exports.get = async (req, res) => {
  try {
    const query = { isDeleted: false };
    const populateFields = ["createdBy", "updatedBy"];

    paginate({
      model: Enquire,
      query: query,
      req: req,
      res: res,
      successMessage: msgConf.enquire.enquireFetchSuccess,
      errorMessage: msgConf.enquire.enquireFetchFailed,
      searchFields: ["firstName"],
    });
  } catch (err) {
    logger.error(`getAllEnquire ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.enquire.enquireFetchFailed,
          res.statusCode
        )
      );
  }
};

exports.getById = async (req, res) => {
  try {
    const { enquireId } = req.params;
    if (!enquireId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.enquire.validation.enquireIdRequired, res.statusCode)
        );
    }
    const isExists = await Enquire.findOne({
      _id: enquireId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${contactId} ${msgConf.enquire.validation.enquireIdNotFound}`,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.enquire.enquireFound, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getEnquireById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.enquire.contactIdNotFound,
          res.statusCode
        )
      );
  }
};

exports.delete = async (req, res) => {
  try {
    const { enquireId } = req.params;
    if (!enquireId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.enquire.validation.enquireIdRequired, res.statusCode)
        );
    }
    const isExists = await Enquire.findOne({
      _id: enquireId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${enquireId} ${msgConf.enquire.validation.enquireIdNotFound}`,
            res.statusCode
          )
        );
    }
    const data = await Enquire.findByIdAndUpdate(
      enquireId,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    console.log("data", data);
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(msgConf.enquire.validation.enquireIdNotFound, res.statusCode)
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.enquire.enquireDeleted, data),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`deleteEnquire ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.enquire.enquireDeleteFailed,
          res.statusCode
        )
      );
  }
};

exports.activeInactive = async (req, res) => {
  try {
    const { enquireId } = req.params;
    if (!enquireId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.enquire.validation.enquireIdRequired, res.statusCode)
        );
    }
    const isExists = await Enquire.findOne({
      _id: enquireId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${contactId} ${msgConf.enquire.validation.enquireIdNotFound}`,
            res.statusCode
          )
        );
    }
    const data = await Enquire.findByIdAndUpdate(
      enquireId,
      { isActive: !isExists.isActive },
      { new: true }
    );
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(msgConf.enquire.validation.enquireIdNotFound, res.statusCode)
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(
            data.isActive
              ? msgConf.enquire.enquireActivated
              : msgConf.enquire.enquireDeactivated,
            data
          ),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`activeEnquire ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.enquire.enquireActivateDeactivateFailed,
          res.statusCode
        )
      );
  }
};
