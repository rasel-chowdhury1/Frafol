import nodemailer from 'nodemailer';
import config from '../config';


const isProduction = process.env.NODE_ENV === 'production';

export const sendEmail = async (to: string, subject: string, html: string) => {

const transporter = nodemailer.createTransport({
  host: config.smtp.host, // sending SMTP server
  port: isProduction ? 465 : 587,             // SSL port
  secure: isProduction,           // true for port 465
  auth: {
    user: config.smtp.user,        // webmail email
    pass: config.smtp.pass   // SMTP/webmail password
  },
});

  

  try {
     console.log('mail send started');
    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.user}>`, // sender address
      to, // list of receivers
      subject,
      html, // html body
    });

    console.log('mail sended successfully');
    
  } catch (error) {
    console.log('send mail error:', error);
    
  }
  console.log('mail sended stopped');
};



















