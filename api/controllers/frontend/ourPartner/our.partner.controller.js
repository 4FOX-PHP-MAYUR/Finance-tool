const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");
const { asyncMultiFileUploadMulter, paginate } = require("../../common/helper");

const Partner = db.partner;

exports.getAllPartner = async (req, res) => {
  try {
    const query = { isDeleted: false, isActive: true };
    const populateFields = [
      {
        path: "updatedBy createdBy",
        select: ["firstName", "lastName", "-roleId"],
      },
    ];

    /*  paginate({model : Partner,query : query,req:req,res:res,successMessage:msgConf.partner.partnerFetchSuccess,
           errorMessage:msgConf.partner.partnerFetchFailed,populateFields : populateFields})
  */
    const partners = await Partner.find(query);
    if (!partners) {
      return res
        .status(400)
        .json(c_error(msgConf.partner.partnerFetchFailed, res.statusCode));
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.partner.partnerFetchSuccess, partners),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getAllPartner ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.partner.partnerFetchFailed,
          res.statusCode
        )
      );
  }
};

exports.getPartnerById = async (req, res) => {
  try {
    const { partnerId } = req.params;
    if (!partnerId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.partner.validation.partnerIdRequired, res.statusCode)
        );
    }
    const isExists = await Partner.findOne({
      _id: partnerId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${partnerId} ${msgConf.partner.validation.partnerIdNotFound}`,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.partner.partnerFound, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getBlogById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.partner.partnerNotFound, res.statusCode)
      );
  }
};
