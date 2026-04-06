const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : smtpPort === 465;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }
  return transporter;
};

const isEmailEnabled = () => Boolean(smtpUser && smtpPass);

const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailEnabled()) {
    throw new Error('SMTP email is not configured');
  }

  const mailer = getTransporter();
 
  const result = await mailer.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html
  });
 
  return result;
};

module.exports = {
  sendEmail,
  isEmailEnabled
};
