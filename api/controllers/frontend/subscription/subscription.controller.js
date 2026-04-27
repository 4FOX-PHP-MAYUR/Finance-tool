const { Types } = require("mongoose");
const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");
const {
  validateSubscription,
} = require("../../../validations/admin.validation");

const axios = require("axios");
const querystring = require("querystring");

const Subscription = db.subscription;

exports.addSubscription = async (req, res) => {
  try {
    const { error, value } = validateSubscription(req.body);
    if (error) {
      return res
        .status(400)
        .json(c_error(error.details[0].message, res.statusCode));
    }

    const { email } = value;

    //API Call
    // const url = "https://oneuae.us13.list-manage.com/subscribe/post?u=6d45b4d1fcf943ec008f33c17&amp;id=a5ebb19e47&amp;f_id=003c4ee9f0";

    // const headers = {
    //   "Content-Type": "application/x-www-form-urlencoded",
    //   Cookie: "BrowserId=j22PfjU7EfCmxivb7nZEfw",
    // };

    // const formData = new URLSearchParams();
    // formData.append("EMAIL", email);

    // const formData = querystring.stringify({
    //   EMAIL: email,
    // });

    // axios
    //   .post(url, formData, { headers })
    //   .then((response) => {
    //     console.log("Response:", response.data);
    //   })
    //   .catch((error) => {
    //     console.error("Error:", error.message);
    //   });

    try {
      //   const formData = new URLSearchParams();
      //   formData.append("EMAIL", email);

      //   const formData = querystring.stringify({
      //     EMAIL: email,
      //   });

      const response = await axios.get(
        `https://oneuae.us13.list-manage.com/subscribe/post?u=6d45b4d1fcf943ec008f33c17&id=a5ebb19e47&f_id=003c4ee9f0&EMAIL=${email}`,
        null,
        {
          params: {
            EMAIL: email,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: "BrowserId=j22PfjU7EfCmxivb7nZEfw",
          },
        }
      );
      console.log("Success:", response.data);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
    }

    const isExists = await Subscription.findOne({
      email: email,
      isDeleted: false,
      isActive: true,
    });

    if (isExists) {
      return res
        .status(400)
        .json(
          c_error(
            `${email} ${msgConf.subscription.validation.subscriptionExists}`,
            res.statusCode
          )
        );
    }

    /* if (isExists) {
      //update status is record exit
      if (isExists.isActive) {
        return res
          .status(400)
          .json(
            c_error(
              `${email} ${msgConf.subscription.validation.subscriptionExists}`,
              res.statusCode
            )
          );
      } else {
        const data = await Subscription.findByIdAndUpdate(
          isExists._id,
          { isActive: !isExists.isActive },
          { new: true }
        );
        if (!data) {
          return res
            .status(400)
            .json(
              c_error(
                msgConf.subscription.validation.subscriptionIdNotFound,
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
                  ? msgConf.subscription.subscriptionActivated
                  : msgConf.subscription.subscriptionDeactivated,
                data
              ),
              res.statusCode
            )
          );
      }
    } */

    //not exit create new record
    const subscriptionData = {
      ...value,
      updatedBy: "6809ae726d654da235faa072",
      createdBy: "6809ae726d654da235faa072",
    };

    const data = await Subscription.create(subscriptionData);
    if (!data) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.subscription.subscriptionCreationFailed,
            res.statusCode
          )
        );
    }
    return res
      .status(201)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.subscription.subscriptionCreated, data),
          res.statusCode
        )
      );
  } catch (err) {
    console.log("err", err);
    logger.error(`addSubscription ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.subscription.subscriptionCreationFailed,
          res.statusCode
        )
      );
  }
};

exports.activeInactive = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json(
          c_error(
            msgConf.subscription.validation.subscriptionIdRequired,
            res.statusCode
          )
        );
    }
    const isExists = await Subscription.findOne({
      email: email,
      isDeleted: false,
      //isActive: true,
    });

    if (!isExists) {
      return res
        .status(400)
        .json(c_error(`${email} ${"not found"}`, res.statusCode));
    }

    if (!isExists.isActive) {
      return res
        .status(400)
        .json(
          c_error(`${email} ${"already exists unsubscribe"}`, res.statusCode)
        );
    }

    const data = await Subscription.findByIdAndUpdate(
      isExists._id,
      { isActive: !isExists.isActive },
      { new: true }
    );
    if (!data) {
      return res
        .status(400)
        .json(c_error("email id not found", res.statusCode));
    }
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(
            data.isActive
              ? msgConf.subscription.subscriptionActivated
              : msgConf.subscription.subscriptionDeactivated,
            data
          ),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`activeSubscription ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message ||
            msgConf.subscription.subscriptionActivateDeactivateFailed,
          res.statusCode
        )
      );
  }
};
