const axios = require('axios');

module.exports = async function verifyRecaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  const { data } = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret,
        response: token,
        remoteip: ip,
      },
    }
  );

  return data;
};
