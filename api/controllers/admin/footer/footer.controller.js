const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");
const { validateFooter } = require("../../../validations/admin.validation");
const { asyncMultiFileUploadMulter, paginate } = require("../../common/helper");

const Footer = db.footer;

exports.add = async (req, res) => {
  try {
    await asyncMultiFileUploadMulter(req, res, "footer");

    console.log("req.body", req.body);
    const { error, value } = validateFooter(req.body);
    if (error) {
      return res
        .status(400)
        .json(c_error(error.details[0].message, res.statusCode));
    }

    if (!req.files?.footerLogo)
      return res
        .status(400)
        .json(c_error(msgConf.footer.validation.footerLogo, res.statusCode));
    // if (!req.files.emailIcon)
    //   return res
    //     .status(400)
    //     .json(c_error(msgConf.footer.validation.emailIcon, res.statusCode));
    // if (!req.files.phoneIcon)
    //   return res
    //     .status(400)
    //     .json(c_error(msgConf.footer.validation.phoneIcon, res.statusCode));

    let socialLinks = [];
    if (value.socialLinks && value.socialLinks.length > 0) {
      for (let i = 0; i < value.socialLinks.length; i++) {
        const socialLinkItem = value.socialLinks[i];
        socialLinks.push({
          socialIcon:
            req.files[`socialLinks[${i}][socialIcon]`]?.[0]?.filename ||
            socialLinkItem.socialIcon,
          socialLink: socialLinkItem?.socialLink,
        });
      }
    }
    console.log("socialLinks", socialLinks);

    let footerAddress = [];
    if (value.footerAddress && value.footerAddress.length > 0) {
      for (let i = 0; i < value.footerAddress.length; i++) {
        const footerAddressItem = value.footerAddress[i];
        footerAddress.push({
          addressIcon:
            req.files[`footerAddress[${i}][addressIcon]`]?.[0]?.filename ||
            footerAddressItem.addressIcon,
          city: footerAddressItem?.city,
          cityAr: footerAddressItem?.cityAr,
          address: footerAddressItem?.address,
          addressAr: footerAddressItem?.addressAr,
          phone: footerAddressItem?.phone,
        });
      }
    }
    console.log("footerAddress", footerAddress);

    value.footerLogo = req.files.footerLogo[0].filename;
    value.socialLinks = socialLinks;
    value.footerAddress = footerAddress;

    value.updatedBy = req.user.userId;
    value.createdBy = req.user.userId;
    const data = await Footer.create(value);
    if (!data) {
      return res
        .status(400)
        .json(c_error(msgConf.footer.footerCreationFailed, res.statusCode));
    }
    return res
      .status(201)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.footer.footerCreated, data),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`addFooter${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.footer.footerCreationFailed,
          res.statusCode
        )
      );
  }
};

exports.update = async (req, res) => {
  try {
    await asyncMultiFileUploadMulter(req, res, "footer");
    const { footerId } = req.params;
    const value = req.body;
    if (!footerId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdRequired, res.statusCode)
        );
    }

    let footerLogo;
    if (req.files.footerLogo && req.files.footerLogo[0]) {
      footerLogo = req.files.footerLogo[0].filename;
    }
    const updateFields = { ...req.body };
    const fieldsToExclude = ["footerLogo"];
    // Remove the fields from the update object
    fieldsToExclude.forEach((field) => {
      delete updateFields[field];
    });
    if (footerLogo) {
      updateFields.footerLogo = footerLogo;
    }

    let socialLinks = [];
    if (value.socialLinks && value.socialLinks.length > 0) {
      for (let i = 0; i < value.socialLinks.length; i++) {
        const socialLinkItem = value.socialLinks[i];
        socialLinks.push({
          socialIcon:
            req.files[`socialLinks[${i}][socialIcon]`]?.[0]?.filename ||
            socialLinkItem.socialIcon,
          socialLink: socialLinkItem?.socialLink,
        });
      }
    }
    console.log("socialLinks", socialLinks);
    updateFields.socialLinks = socialLinks;

    let footerAddress = [];
    if (value.footerAddress && value.footerAddress.length > 0) {
      for (let i = 0; i < value.footerAddress.length; i++) {
        const footerAddressItem = value.footerAddress[i];
        footerAddress.push({
          addressIcon:
            req.files[`footerAddress[${i}][addressIcon]`]?.[0]?.filename ||
            footerAddressItem.addressIcon,
          city: footerAddressItem?.city,
          cityAr: footerAddressItem?.cityAr,
          address: footerAddressItem?.address,
          addressAr: footerAddressItem?.addressAr,
          phone: footerAddressItem?.phone,
          addressUrl: footerAddressItem?.addressUrl,
          
        });
      }
    }
    console.log("footerAddress", footerAddress);
    updateFields.footerAddress = footerAddress;

    const data = await Footer.findByIdAndUpdate(footerId, updateFields, {
      new: true,
    });
    console.log("data", data);
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdNotFound, res.statusCode)
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.footer.footerUpdated, data),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`update Footer${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.footer.footerUpdateFailed,
          res.statusCode
        )
      );
  }
};

exports.get = async (req, res) => {
  try {
    const isExists = await Footer.findOne().sort({ updatedAt: -1 });

    if (!isExists) {
      return res
        .status(400)
        .json(c_error(`${msgConf.config.configNotFound}`, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.footer.footerFetchSuccess, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getConfig ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.footer.footerFetchFailed, res.statusCode)
      );
  }
};

/* exports.get = async (req, res) => {
  console.log("getAllFooter");

  try {
    const query = { isDeleted: false };
    const populateFields = [
      {
        path: "updatedBy createdBy",
        select: ["firstName", "lastName", "-roleId"],
      },
    ];
    const searchFields = ["title"];

    paginate({
      model: Footer,
      query: query,
      req: req,
      res: res,
      successMessage: msgConf.footer.footerFetchSuccess,
      errorMessage: msgConf.footer.footerFetchFailed,
      searchFields: searchFields,
      populateFields: populateFields,
    });
  } catch (err) {
    logger.error(`getAllFooter${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.footer.footerFetchFailed, res.statusCode)
      );
  }
}; */

exports.getById = async (req, res) => {
  try {
    const { footerId } = req.params;
    if (!footerId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdRequired, res.statusCode)
        );
    }
    const populateFields = [
      {
        path: "updatedBy createdBy",
        select: ["firstName", "lastName", "-roleId"],
      },
    ];
    const isExists = await Footer.findOne({
      _id: footerId,
    }).populate(populateFields);

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${footerId} ${msgConf.footer.validation.footerIdNotFound}`,
            res.statusCode
          )
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.footer.footerFound, isExists),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getFooterById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.footer.footerNotFound, res.statusCode)
      );
  }
};

exports.delete = async (req, res) => {
  try {
    const { footerId } = req.params;
    if (!footerId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdRequired, res.statusCode)
        );
    }
    const isExists = await Footer.findOne({
      _id: footerId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${footerId} ${msgConf.footer.validation.footerIdNotFound}`,
            res.statusCode
          )
        );
    }
    const data = await Footer.findByIdAndUpdate(
      footerId,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    console.log("data", data);
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdNotFound, res.statusCode)
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.footer.footerDeleted, data),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`deleteFooter ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.footer.footerDeleted, res.statusCode)
      );
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { footerId } = req.params;
    if (!footerId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdRequired, res.statusCode)
        );
    }
    const isExists = await Footer.findOne({
      _id: footerId,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${footerId} ${msgConf.footer.validation.footerIdNotFound}`,
            res.statusCode
          )
        );
    }
    const data = await Footer.findByIdAndUpdate(
      footerId,
      { isActive: !isExists.isActive },
      { new: true }
    );
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(msgConf.footer.validation.footerIdNotFound, res.statusCode)
        );
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(
            data.isActive
              ? msgConf.footer.footerActivated
              : msgConf.footer.footerDeactivated,
            data
          ),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`activeInactiveFooter ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.footer.footerActiveDeactivateFailed,
          res.statusCode
        )
      );
  }
};
