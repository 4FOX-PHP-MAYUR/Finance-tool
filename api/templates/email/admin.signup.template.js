const subject_mail = "Account Created: Welcome to Our Platform";


const message = (password, username) => {
      return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Created: Welcome to Our Platform</title>
      </head>
      <body>
          <p>Dear ${username},</p>
          <p>Congratulations! Your account has been successfully created. Below is your account password:</p>
          <p><strong>${password}</strong></p>
          <p>Please keep this password secure and do not share it with anyone. If you have any questions or concerns, feel free to contact us.</p>
          <p>This is an auto-generated email. Please do not reply to this email.</p>
          <p>Regards,<br>Your Name</p>
      </body>
      </html>
      `;
  };
  


module.exports = { subject_mail, message };