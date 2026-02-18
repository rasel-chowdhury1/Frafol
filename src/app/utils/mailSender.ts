import nodemailer from 'nodemailer';
import config from '../config'; // your config file with SMTP info

const isProduction = process.env.NODE_ENV === 'production';

console.log('SMTP Production Mode:', isProduction);
console.log('SMTP Host:', config.smtp.host);
console.log('SMTP User:', config.smtp.user);

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,                   // e.g., smtp.websupport.sk
  port: isProduction ? 465 : 587,          // 465 = SSL, 587 = STARTTLS
  secure: isProduction,                     // true for 465 (SSL), false for 587
  auth: {
    user: config.smtp.user,                 // your SMTP email
    pass: config.smtp.pass,                 // your SMTP password / app password
  },
  tls: {
    rejectUnauthorized: false,             // allow self-signed certificates
  },
});

// Verify SMTP connection before sending
transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP connection failed:', err);
  } else {
    console.log('SMTP is ready to send mail ✅');
  }
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  try {
    console.log('Mail send started to:', to);

    const info = await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`, // sender
      to,      // receiver
      subject, // email subject
      html,    // HTML content
    });

    console.log('Mail sent successfully ✅', info.response);
    return info;
  } catch (error) {
    console.error('Send mail error ❌:', error);
    throw error;
  } finally {
    console.log('Mail process ended');
  }
};




// import nodemailer from 'nodemailer';
// import config from '../config';


// const isProduction = process.env.NODE_ENV === 'production';

// console.log(" isProduction:", isProduction);
// console.log(" config.smtp.host:", config.smtp.host);
// console.log(" config.smtp.user:", config.smtp.user);
// console.log(" config.smtp.pass:", config.smtp.pass);

// export const sendEmail = async (to: string, subject: string, html: string) => {

// const transporter = nodemailer.createTransport({
//   host: config.smtp.host, // sending SMTP server
//   port: isProduction ? 465 : 587,             // SSL port
//   secure: isProduction,           // true for port 465
//   auth: {
//     user: config.smtp.user,        // webmail email
//     pass: config.smtp.pass   // SMTP/webmail password
//   },
// });

// transporter.verify((err, success) => {
//   if (err) {
//     console.error('SMTP connection failed', err);
//   } else {
//     console.log('SMTP is ready to send mail');
//   }
// });  


//   try {
//      console.log('mail send started');
//     await transporter.sendMail({
//       from: `"${config.smtp.fromName}" <${config.smtp.user}>`, // sender address
//       to, // list of receivers
//       subject,
//       html, // html body
//     });

//     console.log('mail sended successfully');
    
//   } catch (error) {
//     console.log('send mail error:', error);
    
//   }
//   console.log('mail sended stopped');
// };


