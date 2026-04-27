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
const { paginate } = require("../../common/helper");

const ContactUs = db.contactUs;
const axios = require('axios');
const querystring = require('querystring');

exports.add = async (req, res) => {
  try {

    const value = req.body;
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
        
        const recentRequest = await ContactUs.findOne({
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

    const contactUsData = {
      ...value,
      updatedBy: "6809ae726d654da235faa072",
      createdBy: "6809ae726d654da235faa072",
    };

    const data = await ContactUs.create(contactUsData);

    if(IS_PROD){

    const url = 'https://webto.salesforce.com/servlet/servlet.WebToCase?encoding=UTF-8';
            
                const headers = {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Cookie': 'BrowserId=j22PfjU7EfCmxivb7nZEfw',
                };
            
                const formData = querystring.stringify({
                  orgid: '00D06000001ULPT',
                  retURL: 'https://oneuae.com/contact-us?success=true',
                  name: `${value?.firstName} ${value?.lastNme}`,
                  email: value?.email,
                  phone: value?.mobile,
                  //lead_source: 'Web',
                  description: value?.message,
                  subject :'One Developemnt Website'
                });
            
                axios.post(url, formData, { headers })
                  .then(response => {
                    console.log('Response:', response.data);
                  })
                  .catch(error => {
                    console.error('Error:', error.message);
                  });

    }


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
    logger.error(`addContact: ${err.message}`);
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
      searchFields: ["title"],
    });
  } catch (err) {
    logger.error(`getAllContact ${err.message}`);
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
