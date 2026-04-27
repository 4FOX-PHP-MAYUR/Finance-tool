const config = require('config');
const subject_mail = "MPIN Reset Successfully";

const message = (username) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>MPIN Reset Successfully</title>
      <style type="text/css">
          /* Add your custom CSS styles here */
      </style>
  </head>
  <body>
      <table border="0" cellpadding="0" cellspacing="0" width="600" align="center" class="_mainTable" style="width: 600px; border-collapse: collapse !important; padding: 0 !important;">
          <tr>
              <td>
                  <table width="100%" align="center" style="padding: 0 !important;">
                      <tr>
                          <td>
                              <table align="center">
                                  <tr>
                                      <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 15px;">&nbsp;</td>
                                  </tr>
                                  <tr>
                                      <td style="border-collapse: collapse !important; padding: 0 !important;">
                                      <img src='${config.frontendUrl}/assets/images/enter-logo.png' style="display: block;">
                                      </td>
                                  </tr>
                                  <tr>
                                      <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 35px;">&nbsp;</td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <tr>
                          <td valign="top">
                              <table width="100%" align="center" style="border-collapse: collapse !important; padding: 0 !important;">
                                  <tr>
                                      <td>
                                          <table border="0" cellpadding="0" cellspacing="0" width="540" align="center" style="padding: 0;">
                                              <tr>
                                                  <td style="font-size: 19px; color: #cc3625; font-weight: 600; font-family: 'Open Sans', sans-serif; line-height: 18px;">Dear ${username},</td>
                                              </tr>
                                              <tr>
                                                  <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 20px;">&nbsp;</td>
                                              </tr>
                                              <tr>
                                                  <td style="font-size: 17px; color: #69737c; font-weight: 400; font-family: 'Open Sans', sans-serif; line-height: 22px;">Your MPIN has been successfully reset. You can now use your new MPIN to access your account securely on <a href="https://beta.entertainam.com">entertainam.com</a>.</td>
                                              </tr>
                                              <tr>
                                                  <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 20px;">&nbsp;</td>
                                              </tr>
                                              <tr>
                                                  <td style="font-size: 17px; color: #69737c; font-weight: 400; font-family: 'Open Sans', sans-serif; line-height: 22px;">If you have any questions or concerns, feel free to <a href="https://beta.entertainam.com/contact-us">contact us</a>.</td>
                                              </tr>
                                              <tr>
                                                  <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 20px;">&nbsp;</td>
                                              </tr>
                                              <tr>
                                                  <td style="font-size: 17px; color: #69737c; font-weight: 400; font-family: 'Open Sans', sans-serif; line-height: 22px;">This is an auto-generated email. Please do not reply to this email.</td>
                                              </tr>
                                              <tr>
                                                  <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 20px;">&nbsp;</td>
                                              </tr>
                                              <tr>
                                                  <td style="font-size: 20px; color: #cc3625; font-weight: 600; font-family: 'Open Sans', sans-serif; line-height: 22px;">Regards,</td>
                                              </tr>
                                              <tr>
                                                  <td style="font-size: 17px; color: #69737c; font-weight: 400; font-family: 'Open Sans', sans-serif; line-height: 22px;">entertainam.com</td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 20px;">&nbsp;</td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>

          <tr>
              <td>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="width: 100%; background-color: #cc3625;">
                      <tr>
                          <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 10px;">&nbsp;</td>
                      </tr>
                      <tr>
                          <td>
                              <table width="420" align="center">
                                  <tr>
                                      <td align="right" style="font-size: 12px; color: #fff; font-weight: 400; font-family: 'Open Sans', sans-serif; line-height: 18px;">©2024 All Rights Reserved Entertainam</td>
                                      <td align="center" width="25"><img src="${config.frontendUrl}/assets/images/img5.png"></td>
                                      <td align="left">
                                          <table style="border-collapse: collapse !important; padding: 0px !important;" width="100%" align="center">
                                              <tr>
                                                  <td valign="top" style="border-collapse: collapse !important; padding: 0px !important;">
                                                      <table style="border-collapse: collapse !important; padding: 0px !important;" align="left">
                                                          <tr>
                                                          <td style="padding: 0px 5px;"><a href="#" target="_blank"><img src="${config.frontendUrl}/assets/images/img1.png"></a></td>
                                                          <td style="padding: 0px 5px;"><a href="#" target="_blank"><img src="${config.frontendUrl}/assets/images/img2.png"></a></td>
                                                          <td style="padding: 0px 5px;"><a href="#" target="_blank"><img src="${config.frontendUrl}/assets/images/img3.png"></a></td>
                                                          <td style="padding: 0px 5px;"><a href="#" target="_blank"><img src="${config.frontendUrl}/assets/images/img4.png"></a></td>
                                                          </tr>
                                                      </table>
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                      <tr>
                          <td align="left" valign="top" style="font-family: 'Gotham Book', sans-serif; font-size: 16px; color: #000000; line-height: 10px;">&nbsp;</td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>
  `;
};

module.exports = { subject_mail, message };
