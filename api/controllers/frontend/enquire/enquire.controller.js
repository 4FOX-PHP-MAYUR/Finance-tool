const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");
const verifyRecaptcha = require("../../../utils/verify.recaptcha");
const getClientIp = require("../../../utils/common");
const { validateEnquire } = require("../../../validations/admin.validation");
const { paginate } = require("../../common/helper");

const Enquire = db.enquire;
const axios = require('axios');
const querystring = require('querystring');

exports.add = async (req, res) => {
  try {
   
    const value = req.body;
 console.log('value?.mobile:', value);
console.log('value?.mobile:', value?.mobile);
console.log('value?.countryCode:', value?.countryCode);  

const IS_PROD = process.env.APP_ENV === "production";

// 1️⃣ reCAPTCHA token check
    if (!value?.captchaToken) {
      return res
        .status(400)
        .json(c_error('reCAPTCHA token missing', 400));
    }

    // ✅ Get real client IP from Cloudflare
    const clientIp = await getClientIp(req);
    console.log('Client IP:', clientIp);

    // ⏱ block if same IP within 2 minutes
const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

const recentRequest = await Enquire.findOne({
  clientIp,
  createdAt: { $gte: twoMinutesAgo },
});

if (recentRequest) {
  return res.status(429).json(
    c_error(
      'You’ve recently submitted a request. Please wait a couple of minutes before trying again.',
      429
    )
  );
}


    // 2️⃣ Verify reCAPTCHA with Google
    const recaptchaResult = await verifyRecaptcha(
      value.captchaToken,
      req.ip
    );

    if (!recaptchaResult.success) {
      return res
        .status(403)
        .json(c_error('reCAPTCHA verification failed', 403));
    }

    // 3️⃣ Score validation (tune as needed)
    if (recaptchaResult.score < 0.5) {
      return res.status(403).json(
        c_error('Suspicious activity detected', 403, {
          score: recaptchaResult.score,
        })
      );
    }

    // Optional but recommended
  /*   if (recaptchaResult.action !== 'submit') {
      return res
        .status(403)
        .json(c_error('Invalid reCAPTCHA action', 403));
    } */
   const enquireData = {
      ...value,
      clientIp : clientIp,
      updatedBy: "6809ae726d654da235faa072",
      createdBy: "6809ae726d654da235faa072",
    };
        
        if(IS_PROD){
           const url = 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8';
        
            const headers = {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Cookie': 'BrowserId=j22PfjU7EfCmxivb7nZEfw',
            };
        
            const formData = querystring.stringify({
              oid: '00D06000001ULPT',
              retURL: 'https://oneuae.com/contact-us?success=true',
              first_name: value?.firstName,
              last_name: value?.lastName,
              email: value?.email,
              //'00NJ6000001xqhI': value?.nationality,
              //'00NJ6000001xqgY': value?.countryCode,
              '00NJ6000001xqgY':  `+${value?.countryCode}`,
              phone: value?.mobile,
              lead_source: 'Web',
              '00NJ6000001xqhL': value?.noOfBedrooms,
              '00NJ600000DBqUn':   value?.projectID ?? "Laguna Residences",
              '00NJ6000002yuXc': value?.isAgreeCommunication || true, // Email Opt-In
              //'00NJ6000001xqhV' :"Villa" //Property Type
              //'00NJ600000AvvB5' :"input text" //Campaign Name
            });


            /* const formData = querystring.stringify({
                      oid: '00D06000001ULPT',
                      retURL: 'https://oneuae.com/contact-us?success=true',
                      first_name: value?.firstName,
                      last_name: value?.lastName,
                      email: value?.email,
                      //'00NJ6000001xqhI': value?.nationality,
                      '00NJ6000001xqgY': `+${value?.countryCode}`,
                      phone: value?.mobile,
                      lead_source: 'Web',
                      '00NJ6000001xqhL': value?.noOfBedrooms,
                      '00NJ600000DBqUn': value?.projectID ?? "DO Dubai Island",
                      '00NJ6000002yuXc': value?.isAgreeCommunication || true, // Email Opt-In
                      //'00NJ6000001xqhV' :"Villa" //Property Type
                      //'00NJ600000AvvB5' :"input text" //Campaign Name
                    }); */

            console.log("formData",formData);
        
            axios.post(url, formData, { headers })
              .then(response => {
                console.log('Response:', response.data);
              })
              .catch(error => {
                console.error('Error:', error.message);
              });

        }


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
      searchFields: ["title"],
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
