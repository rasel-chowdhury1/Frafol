import { sendEmail } from "./mailSender";

interface BookingNotificationEmailParams {
  sentTo: string;       // user email
  subject: string;      // email subject
  userName: string;     // sender name (service provider)
  messageText: string;  // main text
}

interface OtpSendEmailParams {
  sentTo: string;
  subject: string;
  name: string;
  otp: string | number;
  expiredAt: string;
}

const logoUrl = 'https://res.cloudinary.com/dns84qf2p/image/upload/v1768557807/frafolLogo_vftuvh.png'; // Use Frafol domain
const primaryColor = '#AD2B08';
const supportEmail = 'support@frafol.com';

const otpSendEmail = async ({
  sentTo,
  subject,
  name,
  otp,
  expiredAt,
}: OtpSendEmailParams): Promise<void> => {

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img 
          src="${logoUrl}" 
          alt="Frafol Logo" 
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" 
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          One-Time Password (OTP)
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Use the following One-Time Password (OTP) to complete your verification.
          This code is valid for a limited time.
        </p>

        <div style="
          background-color: #f4f6fb;
          border: 1px dashed ${primaryColor};
          padding: 20px;
          text-align: center;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <p style="margin: 0; font-size: 14px; color: #555;">Your OTP Code</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: ${primaryColor}; letter-spacing: 4px;">
            ${otp}
          </p>
        </div>

        <p style="font-size: 14px; color: #666;">
          This OTP will expire on:<br />
          <strong>${expiredAt.toLocaleString()}</strong>
        </p>

        <p style="margin-top: 24px; font-size: 14px;">
          If you didn’t request this code or need assistance, please contact our
          support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong><br />
          Frafol
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, subject, emailBody);
};




const profileVerifiedEmail = async ({
  sentTo,
  subject,
  name,
}: {
  sentTo: string;
  subject: string;
  name: string;
}): Promise<void> => {

  const emailBody = `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background-color: #ffffff;
    ">

      <!-- Header -->
      <div style="
        background-color: ${primaryColor};
        text-align: center;
        padding: 24px;
      ">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="
            max-width: 150px;
            height: auto;
            display: block;
            margin: 0 auto 12px;
          "
        />
        <h1 style="
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        ">
          Profile Verified
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p style="margin-top: 0;">
          Hello <strong>${name}</strong>,
        </p>

        <p>
          We’re pleased to let you know that your <strong>Frafol profile has been successfully verified</strong>
          by our administration team.
        </p>

        <div style="
          background-color: #fdf0ec;
          border: 1px solid ${primaryColor};
          padding: 20px;
          text-align: center;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <p style="
            margin: 0;
            font-size: 16px;
            font-weight: bold;
            color: ${primaryColor};
          ">
            Your account is now active and ready to use
          </p>
        </div>

        <p style="font-size: 14px; color: #666;">
          You can now access all available features and begin using Frafol without any restrictions.
        </p>

        <p style="margin-top: 24px; font-size: 14px;">
          If you have any questions or need support, please contact us at
          <a
            href="mailto:${supportEmail}"
            style="color: ${primaryColor}; text-decoration: none;"
          >
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>The Frafol Team</strong><br />
          Frafol
        </p>
      </div>

      <!-- Footer -->
      <div style="
        background-color: #f5f5f5;
        text-align: center;
        padding: 14px;
        font-size: 12px;
        color: #777;
        line-height: 1.6;
      ">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Frafol. All rights reserved.
        </p>
        <p style="margin: 6px 0 0;">
          <!-- LEGAL_INFORMATION_PLACEHOLDER -->
          Legal information will be provided here.
        </p>
      </div>

    </div>
  `;

  sendEmail(sentTo, subject, emailBody);
};

 const sendBookingNotificationEmail = async ({
  sentTo,
  subject,
  userName,
  messageText,
}: BookingNotificationEmailParams): Promise<void> => {
  await sendEmail(
    sentTo,
    subject,
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
       <h1>Hello ${userName},</h1>
       <p style="font-size: 16px;">${messageText}</p>
       <p style="font-size: 14px; color: #666;">Thank you for using our platform!</p>
    </div>`
  );
};

export { otpSendEmail, sendBookingNotificationEmail , profileVerifiedEmail};
