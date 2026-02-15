import { emitNotification } from "../../socketIo";
import { getAdminData } from "../DB/adminStrore";
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

interface WelcomeEmailParams {
  sentTo: string;
  subject: string;
  name: string;
  userType: "client" | "professional"; // to show correct how-it-works link
}

interface FrafolChoiceEmailParams {
  sentTo: string;
  subject: string;
  name: string;
}

interface SendEmailNotificationParams {
  userId: string;
  email: string;
  name?: string;
  notificationText?: string;
}

const logoUrl = 'https://res.cloudinary.com/dns84qf2p/image/upload/v1768557807/frafolLogo_vftuvh.png'; // Use Frafol domain
const primaryColor = '#AD2B08';
const supportEmail = 'support@frafol.com';

const clientUrl = process.env.CLIENT_URL || "http://10:10:10:38:3000";

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


export const welcomeEmail = async ({
  sentTo,
  subject,
  name,
  userType,
}: WelcomeEmailParams): Promise<void> => {
  const howItWorksLink =
    userType === "client"
      ? `${clientUrl}/how-ordering-works`
      : `${clientUrl}/how-it-works`;

  const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

    <!-- Header -->
    <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
        Welcome to Frafol 🎉
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 24px; color: #333;">
      <p>Hello <strong>${name}</strong>,</p>

      <p>
        Welcome to <strong>Frafol</strong>! Your account has been successfully created.
        We’re excited to have you on board.
      </p>

      <p>
        To get started, please review how our platform works:
      </p>

      <p style="margin: 20px 0;">
        <a href="${howItWorksLink}" style="
          display: inline-block;
          padding: 12px 20px;
          background-color: ${primaryColor};
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
        ">
          How It Works
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />

      <p style="font-size: 14px; color: #555;">
        Please review our policies:
      </p>

      <ul style="font-size: 14px; color: #555; padding-left: 20px;">
        <li>
          <a href="${clientUrl}/terms-of-service-marketplace" style="color: ${primaryColor}; text-decoration: none;">
            Terms & Conditions (Marketplace)
          </a>
        </li>
        <li>
          <a href="${clientUrl}/terms-of-service" style="color: ${primaryColor}; text-decoration: none;">
            Terms & Conditions (Conceptual)
          </a>
        </li>
        <li>
          <a href="${clientUrl}/data-protection" style="color: ${primaryColor}; text-decoration: none;">
            GDPR & Data Protection Policy
          </a>
        </li>
      </ul>

      <p style="margin-top: 24px; font-size: 14px;">
        If you have any questions, feel free to contact us at
        <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
          ${supportEmail}
        </a>.
      </p>

      <p style="margin-top: 32px;">
        Best regards,<br />
        <strong>Frafol Team</strong>
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

  const profileSettingsUrl = `${clientUrl}/dashboard/professional/profile-settings`;

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
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Profile Verified ✅
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Great news! Your <strong>Frafol professional profile has been successfully verified</strong>
          by our administration team.
        </p>

        <div style="
          background-color: #fdf0ec;
          border: 1px solid ${primaryColor};
          padding: 20px;
          border-radius: 6px;
          margin: 24px 0;
          text-align: center;
        ">
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: ${primaryColor};">
            Your account is now active
          </p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #555;">
            You can now complete your profile and start receiving requests.
          </p>
        </div>

        <p style="font-size: 14px; color: #555;">
          <strong>Next step:</strong> Upload your portfolio so clients can see your work and contact you.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${profileSettingsUrl}" style="
            display: inline-block;
            padding: 14px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Upload Your Portfolio
          </a>
        </div>

        <p style="font-size: 14px; color: #666;">
          A complete profile with portfolio images and details helps you get more visibility and bookings.
        </p>

        <p style="margin-top: 24px; font-size: 14px;">
          Need help? Contact us anytime at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>The Frafol Team</strong>
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

const frafolChoiceEmail = async ({
  sentTo,
  subject,
  name,
}: FrafolChoiceEmailParams): Promise<void> => {
  const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; background-color:#fff;">
    
    <!-- Header -->
    <div style="background-color: ${primaryColor}; text-align:center; padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px; height:auto; display:block; margin:0 auto 12px;" />
      <h1 style="color:#fff; margin:0; font-size:22px; font-weight:600;">Payment Successful 🎉</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px; color:#333;">
      <p>Hello <strong>${name}</strong>,</p>
      
      <p>Your <strong>Frafol Choice</strong> has been <strong>successfully activated on your profile</strong>! 🚀</p>

      <ul style="padding-left:20px; color:#333;">
        <li>Highlighted profile for higher visibility</li>
        <li>Higher ranking in client search results</li>
        <li>Featured visibility on the Frafol homepage</li>
        <li>Frafol Choice badge displayed on your profile</li>
      </ul>

      <p>Your profile now gets priority over standard profiles.</p>

      <p style="margin-top:24px; font-size:14px;">
        If you have any questions, contact us at 
        <a href="mailto:${supportEmail}" style="color:${primaryColor}; text-decoration:none;">
          ${supportEmail}
        </a>.
      </p>

      <p style="margin-top:32px;">
        Kind regards,<br />
        <strong>Frafol Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f5f5f5; text-align:center; padding:14px; font-size:12px; color:#777;">
      © ${new Date().getFullYear()} Frafol. All rights reserved.
    </div>
  </div>
  `;

  await sendEmail(sentTo, subject, emailBody);
};


const sendEmailAndNotification = (params: SendEmailNotificationParams) => {
  const { userId, email, name,notificationText } = params;

  const adminData = getAdminData();

  process.nextTick(() => {
    // 🔹 Send Email
    frafolChoiceEmail({
      sentTo: email,
      subject: 'Frafol Choice Activated Successfully 🎉',
      name: name || 'User',
    }).catch((err) => console.error('❌ Frafol Choice email failed:', err));


    // 🔹 Emit Notification
    emitNotification({
      userId: ( adminData as any)._id as any,
      receiverId: userId as any, // send to same user
      userMsg: {
        image: '', // optional profile image
        text: notificationText || 'Your Frafol Choice has been successfully activated! 🚀',
      },
      type: "AdminNotice",
    }).catch((err) => console.error('❌ Notification failed:', err));

    console.log('✅ Email & notification queued:', "AdminNotice for frafol choice activation");
  });
};


interface SendFrafolEmailParams {
  to: string | string[];
  subject: string;
  message: string;
}

const sendFrafolEmail = ({
  to,
  subject,
  message,
}: SendFrafolEmailParams) => {
  const recipients = Array.isArray(to) ? to : [to];

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; background-color:#ffffff;">

      <!-- Header (Logo only) -->
      <div style="background-color:${primaryColor}; text-align:center; padding:24px;">
        <img 
          src="${logoUrl}" 
          alt="Frafol Logo" 
          style="max-width:150px; height:auto; display:block; margin:0 auto;" 
        />
      </div>

      <!-- Body -->
      <div style="padding:24px; color:#333333;">
        <h2 style="margin-top:0; font-size:22px; color:#111111;">
          ${subject}
        </h2>

        <p style="font-size:15px; line-height:1.6;">
          ${message}
        </p>

        <p style="margin-top:32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#f5f5f5; text-align:center; padding:14px; font-size:12px; color:#777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>

    </div>
  `;

  // 🔹 Fire-and-forget (non-blocking)
  process.nextTick(() => {
    recipients.forEach((email) => {
      sendEmail(email, subject, emailBody).catch((err) => {
        console.error(`❌ Failed to send Frafol email to ${email}`, err);
      });
    });
  });
};

export { otpSendEmail, sendBookingNotificationEmail , profileVerifiedEmail, sendEmailAndNotification, sendFrafolEmail};
