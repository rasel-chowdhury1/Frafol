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
  userType: "client" | "professional" | "professional_verified";
}

interface FrafolChoiceEmailParams {
  sentTo: string;
  name: string;
  // order / invoice fields
  orderId?: string;
  planName?: string;
  planDays?: number;
  amount?: number;
  currency?: string;
  purchaseDate?: string;
  expiryDate?: string;
}

interface SendEmailNotificationParams {
  userId: string;
  email: string;
  name?: string;
  notificationText?: string;
  orderId?: string;
  planName?: string;
  planDays?: number;
  amount?: number;
  currency?: string;
  purchaseDate?: string;
  expiryDate?: string;
}

const logoUrl = 'https://res.cloudinary.com/dns84qf2p/image/upload/v1768557807/frafolLogo_vftuvh.png'; // Use Frafol domain
const primaryColor = '#AD2B08';
const supportEmail = 'support@frafol.com';

const clientUrl = process.env.FRONT_URL || "http://76.13.133.178:3000";

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
  const howItWorksLink = userType === "client"
    ? `${clientUrl}/how-ordering-works`
    : `${clientUrl}/how-it-works`;

  const dynamicSection =
    userType === "professional"
      ? `
      <p>
        Your account has been successfully created. Our admin team is currently
        reviewing your profile.
      </p>
      <div style="
        background-color: #fff8e1;
        border-left: 4px solid #f5a623;
        padding: 14px 18px;
        border-radius: 4px;
        margin: 20px 0;
        font-size: 14px;
        color: #555;
      ">
        <strong>Profile Verification in Progress</strong><br/>
        Your profile is being verified by our team. You will receive a confirmation
        email once the verification is complete.
      </div>`
      : `
      <p>
        ${userType === "professional_verified"
          ? "Your profile has been verified! You can now start receiving booking requests."
          : "Your account has been successfully created. We’re excited to have you on board."}
      </p>
      <p>To get started, please review how our platform works:</p>
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
      </p>`;

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
      <p>Welcome to <strong>Frafol</strong>!</p>
      ${dynamicSection}

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

  const profileSettingsUrl = `${clientUrl}/dashboard/professional/profile-settings?tab=portfolio`;

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
          New Booking Request
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${userName}</strong>,</p>

        <p>You have received a new booking request on <strong>Frafol</strong>. Please review the details below.</p>

        <div style="
          background-color: #fdf0ec;
          border: 1px dashed ${primaryColor};
          padding: 20px;
          text-align: center;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <p style="margin: 0; font-size: 14px; color: #555;">Booking Details</p>
          <p style="margin: 10px 0 0; font-size: 15px; color: #333333; line-height: 1.6;">
            ${messageText}
          </p>
        </div>

        <p style="font-size: 14px; color: #555;">
          Log in to your Frafol account to review and respond to this request.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Booking Request
          </a>
        </div>

        <p style="margin-top: 24px; font-size: 14px;">
          If you have any questions, please contact our support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
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

const frafolChoiceEmail = async ({
  sentTo,
  name,
  orderId,
  planName,
  planDays,
  amount,
  currency = 'EUR',
  purchaseDate,
  expiryDate,
}: FrafolChoiceEmailParams): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">

    <!-- Header -->
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Frafol Choice Activated 🎉</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px;color:#333;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>Frafol Choice</strong> subscription has been <strong>successfully activated</strong>. Your profile now gets higher visibility and priority placement.</p>

      <!-- Benefits -->
      <div style="background-color:#fdf0ec;border:1px solid ${primaryColor};border-radius:6px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:bold;color:${primaryColor};">Your Frafol Choice Benefits:</p>
        <ul style="margin:0;padding-left:18px;color:#333;font-size:14px;">
          <li>Highlighted profile for higher visibility</li>
          <li>Higher ranking in client search results</li>
          <li>Featured visibility on the Frafol homepage</li>
          <li>Frafol Choice badge displayed on your profile</li>
          <li>Priority placement over standard profiles</li>
        </ul>
      </div>

      <!-- Order Details -->
      <p style="font-weight:bold;margin-bottom:8px;">Order Details</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
        ${orderId ? `<tr><td style="padding:6px 0;color:#777;">Order ID</td><td style="padding:6px 0;text-align:right;">${orderId}</td></tr>` : ''}
        ${planName ? `<tr><td style="padding:6px 0;color:#777;">Plan</td><td style="padding:6px 0;text-align:right;">${planName}</td></tr>` : ''}
        ${planDays ? `<tr><td style="padding:6px 0;color:#777;">Duration</td><td style="padding:6px 0;text-align:right;">${planDays} days</td></tr>` : ''}
        ${amount !== undefined ? `<tr><td style="padding:6px 0;color:#777;">Amount Paid</td><td style="padding:6px 0;text-align:right;font-weight:bold;">${amount} ${currency}</td></tr>` : ''}
        ${purchaseDate ? `<tr><td style="padding:6px 0;color:#777;">Purchase Date</td><td style="padding:6px 0;text-align:right;">${purchaseDate}</td></tr>` : ''}
        ${expiryDate ? `<tr><td style="padding:6px 0;color:#777;">Valid Until</td><td style="padding:6px 0;text-align:right;color:${primaryColor};font-weight:bold;">${expiryDate}</td></tr>` : ''}
      </table>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;" />

      <!-- Legal -->
      <p style="font-size:13px;color:#555;margin-bottom:4px;">By completing this purchase you agreed to:</p>
      <ul style="font-size:13px;color:#555;padding-left:18px;margin-top:4px;">
        <li><a href="${clientUrl}/terms-of-service-marketplace" style="color:${primaryColor};text-decoration:none;">Terms &amp; Conditions (Marketplace)</a></li>
        <li><a href="${clientUrl}/terms-of-service" style="color:${primaryColor};text-decoration:none;">Terms &amp; Conditions (Conceptual)</a></li>
        <li><a href="${clientUrl}/data-protection" style="color:${primaryColor};text-decoration:none;">GDPR &amp; Data Protection Policy</a></li>
      </ul>

      <p style="font-size:13px;color:#777;margin-top:16px;">
        This email serves as your invoice / payment confirmation. Please keep it for your records.
      </p>

      <p style="margin-top:24px;font-size:14px;">
        Questions? Contact us at <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.
      </p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f5f5f5;text-align:center;padding:14px;font-size:12px;color:#777;">
      © ${new Date().getFullYear()} Frafol. All rights reserved.
    </div>
  </div>
  `;

  await sendEmail(sentTo, 'Frafol Choice Activated – Order Confirmation', emailBody);
};


const sendEmailAndNotification = (params: SendEmailNotificationParams) => {
  const { userId, email, name, notificationText, orderId, planName, planDays, amount, currency, purchaseDate, expiryDate } = params;

  const adminData = getAdminData();

  process.nextTick(() => {
    // 🔹 Send Email
    frafolChoiceEmail({
      sentTo: email,
      name: name || 'User',
      orderId,
      planName,
      planDays,
      amount,
      currency,
      purchaseDate,
      expiryDate,
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

const profileDeclinedEmail = async ({
  sentTo,
  name,
  reason,
}: {
  sentTo: string;
  name: string;
  reason: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Profile Verification Update</h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Thank you for submitting your professional profile on <strong>Frafol</strong>.
          After careful review, we regret to inform you that your profile verification
          has not been approved at this time.
        </p>

        <div style="
          background-color: #fff3f3;
          border-left: 4px solid #e53935;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Reason for Decline:</strong><br/>
          ${reason}
        </div>

        <p style="font-size: 14px; color: #555;">
          If you believe this is an error or would like to provide additional information,
          please contact our support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
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

  await sendEmail(sentTo, 'Profile Verification Declined', emailBody);
};

const passwordChangedEmail = async ({
  sentTo,
  name,
}: {
  sentTo: string;
  name: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Password Changed</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your account password has been successfully changed.</p>
        <div style="background-color: #fff8e1; border-left: 4px solid #f5a623; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          If you did not make this change, please contact us immediately at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </div>
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;
  await sendEmail(sentTo, 'Your Password Has Been Changed', emailBody);
};

const forgotPasswordEmail = async ({
  sentTo,
  name,
}: {
  sentTo: string;
  name: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Password Reset Successful</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your password has been reset successfully. You can now log in with your new password.</p>
        <div style="background-color: #fff8e1; border-left: 4px solid #f5a623; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          If you did not request this reset, please contact us immediately at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </div>
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;
  await sendEmail(sentTo, 'Your Password Has Been Reset', emailBody);
};

const bankDetailsChangedEmail = async ({
  sentTo,
  name,
}: {
  sentTo: string;
  name: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bank Account Updated</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your bank account details on <strong>Frafol</strong> have been successfully updated.</p>
        <div style="background-color: #fff8e1; border-left: 4px solid #f5a623; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          If you did not make this change, please contact us immediately at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </div>
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;
  await sendEmail(sentTo, 'Bank Account Details Changed', emailBody);
};

const accountBlockedEmail = async ({
  sentTo,
  name,
  reason,
  isDeleted = false,
}: {
  sentTo: string;
  name: string;
  reason?: string;
  isDeleted?: boolean;
}): Promise<void> => {
  const action = isDeleted ? 'deleted' : 'blocked';
  const title = isDeleted ? 'Account Deleted' : 'Account Blocked';
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${title}</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Frafol account has been <strong>${action}</strong> by our admin team.</p>
        ${reason ? `
        <div style="background-color: #fff3f3; border-left: 4px solid #e53935; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          <strong>Reason:</strong><br/>${reason}
        </div>` : ''}
        <p style="font-size: 14px; color: #555;">
          If you believe this is a mistake, please reach out to us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;
  await sendEmail(sentTo, `Your Frafol Account Has Been ${isDeleted ? 'Deleted' : 'Blocked'}`, emailBody);
};

const frafolChoiceRenewalSuccessEmail = async ({
  sentTo,
  name,
  orderId,
  planName,
  planDays,
  amount,
  currency = 'EUR',
  purchaseDate,
  expiryDate,
}: FrafolChoiceEmailParams): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Frafol Choice Renewed ✅</h1>
    </div>
    <div style="padding:24px;color:#333;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>Frafol Choice</strong> subscription has been <strong>successfully renewed</strong>. Your benefits continue without interruption.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin:16px 0;">
        ${orderId ? `<tr><td style="padding:6px 0;color:#777;">Order ID</td><td style="padding:6px 0;text-align:right;">${orderId}</td></tr>` : ''}
        ${planName ? `<tr><td style="padding:6px 0;color:#777;">Plan</td><td style="padding:6px 0;text-align:right;">${planName}</td></tr>` : ''}
        ${planDays ? `<tr><td style="padding:6px 0;color:#777;">Duration</td><td style="padding:6px 0;text-align:right;">${planDays} days</td></tr>` : ''}
        ${amount !== undefined ? `<tr><td style="padding:6px 0;color:#777;">Amount Paid</td><td style="padding:6px 0;text-align:right;font-weight:bold;">${amount} ${currency}</td></tr>` : ''}
        ${purchaseDate ? `<tr><td style="padding:6px 0;color:#777;">Renewal Date</td><td style="padding:6px 0;text-align:right;">${purchaseDate}</td></tr>` : ''}
        ${expiryDate ? `<tr><td style="padding:6px 0;color:#777;">Valid Until</td><td style="padding:6px 0;text-align:right;color:${primaryColor};font-weight:bold;">${expiryDate}</td></tr>` : ''}
      </table>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;" />
      <p style="font-size:13px;color:#777;">This email serves as your invoice / payment confirmation for the renewal. Please keep it for your records.</p>
      <p style="font-size:13px;color:#555;">By renewing you continue to agree to our <a href="${clientUrl}/terms-of-service-marketplace" style="color:${primaryColor};text-decoration:none;">Terms &amp; Conditions</a> and <a href="${clientUrl}/data-protection" style="color:${primaryColor};text-decoration:none;">GDPR &amp; Data Protection Policy</a>.</p>
      <p style="margin-top:24px;font-size:14px;">Questions? <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a></p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    <div style="background-color:#f5f5f5;text-align:center;padding:14px;font-size:12px;color:#777;">© ${new Date().getFullYear()} Frafol. All rights reserved.</div>
  </div>`;
  await sendEmail(sentTo, 'Frafol Choice Renewed – Payment Confirmation', emailBody);
};

const frafolChoiceRenewalFailedEmail = async ({
  sentTo,
  name,
  expiryDate,
}: {
  sentTo: string;
  name: string;
  expiryDate?: string;
}): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Payment Failed</h1>
    </div>
    <div style="padding:24px;color:#333;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>We were unable to process the renewal payment for your <strong>Frafol Choice</strong> subscription.</p>
      <div style="background-color:#fff3f3;border-left:4px solid #e53935;padding:14px 18px;border-radius:4px;margin:20px 0;font-size:14px;color:#555;">
        <strong>Action Required:</strong> Please try a different payment method to avoid losing your Frafol Choice benefits.
        ${expiryDate ? `<br/>Your current subscription remains active until <strong>${expiryDate}</strong>.` : ''}
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${clientUrl}/dashboard/professional/subscription" style="display:inline-block;padding:12px 22px;background-color:${primaryColor};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">Update Payment Method</a>
      </div>
      <p style="font-size:14px;color:#555;">If you need help, contact us at <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.</p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    <div style="background-color:#f5f5f5;text-align:center;padding:14px;font-size:12px;color:#777;">© ${new Date().getFullYear()} Frafol. All rights reserved.</div>
  </div>`;
  await sendEmail(sentTo, 'Frafol Choice – Payment Failed, Please Update Your Payment Method', emailBody);
};

const frafolChoiceExpiringSoonEmail = async ({
  sentTo,
  name,
  expiryDate,
  daysLeft,
}: {
  sentTo: string;
  name: string;
  expiryDate: string;
  daysLeft: number;
}): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Your Frafol Choice Expires Soon</h1>
    </div>
    <div style="padding:24px;color:#333;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>Frafol Choice</strong> subscription is expiring in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on <strong>${expiryDate}</strong>.</p>
      <div style="background-color:#fff8e1;border-left:4px solid #f5a623;padding:14px 18px;border-radius:4px;margin:20px 0;font-size:14px;color:#555;">
        <strong>Don't lose your perks!</strong> Renew now to keep your highlighted profile, priority ranking, and Frafol Choice badge.
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${clientUrl}/dashboard/professional/subscription" style="display:inline-block;padding:12px 22px;background-color:${primaryColor};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">Renew Frafol Choice</a>
      </div>
      <p style="font-size:14px;color:#555;">Questions? <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a></p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    <div style="background-color:#f5f5f5;text-align:center;padding:14px;font-size:12px;color:#777;">© ${new Date().getFullYear()} Frafol. All rights reserved.</div>
  </div>`;
  await sendEmail(sentTo, `Your Frafol Choice Expires in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''} – Renew Now`, emailBody);
};

const frafolChoiceExpiredEmail = async ({
  sentTo,
  name,
}: {
  sentTo: string;
  name: string;
}): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Frafol Choice Has Expired</h1>
    </div>
    <div style="padding:24px;color:#333;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your <strong>Frafol Choice</strong> subscription has expired. Your profile has returned to standard visibility.</p>
      <div style="background-color:#fff3f3;border-left:4px solid #e53935;padding:14px 18px;border-radius:4px;margin:20px 0;font-size:14px;color:#555;">
        <strong>You have lost access to:</strong>
        <ul style="margin:8px 0 0;padding-left:16px;">
          <li>Highlighted profile &amp; priority ranking</li>
          <li>Featured visibility on the Frafol homepage</li>
          <li>Frafol Choice badge on your profile</li>
        </ul>
      </div>
      <p style="font-size:14px;color:#555;">Renew your Frafol Choice to regain these benefits and stay ahead of the competition.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${clientUrl}/dashboard/professional/subscription" style="display:inline-block;padding:12px 22px;background-color:${primaryColor};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">Renew Frafol Choice</a>
      </div>
      <p style="font-size:14px;color:#555;">Questions? <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a></p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    <div style="background-color:#f5f5f5;text-align:center;padding:14px;font-size:12px;color:#777;">© ${new Date().getFullYear()} Frafol. All rights reserved.</div>
  </div>`;
  await sendEmail(sentTo, 'Your Frafol Choice Has Expired – Renew to Restore Your Benefits', emailBody);
};

const sendCommentOrReplyEmail = async ({
  sentTo,
  receiverName,
  actorName,
  communityTitle,
  commentText,
  isReply,
}: {
  sentTo: string;
  receiverName: string;
  actorName: string;
  communityTitle: string;
  commentText: string;
  isReply: boolean;
}): Promise<void> => {
  const action = isReply ? 'replied to a comment on' : 'commented on';
  const subject = isReply ? 'New Reply on Your Post' : 'New Comment on Your Post';

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          ${subject}
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${actorName}</strong> ${action} your post
          <strong>"${communityTitle}"</strong>.
        </p>

        <div style="
          background-color: #f4f6fb;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #333;
          font-style: italic;
        ">
          "${commentText}"
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/community" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Post
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
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

const sendBookingRequestEmail = async ({
  sentTo,
  receiverName,
  senderName,
  orderType,
  serviceType,
  packageName,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
  orderType: 'direct' | 'custom';
  serviceType?: string;
  packageName?: string;
}): Promise<void> => {
  const isDirectBooking = orderType === 'direct';
  const orderLabel = isDirectBooking
    ? packageName ? `"${packageName}"` : 'a package'
    : `custom ${serviceType?.trim() || 'service'}`;
  const bookingType = isDirectBooking ? 'Direct Booking' : `Custom ${serviceType?.trim() || 'Service'} Booking`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          New ${bookingType} Request
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          You have received a new <strong>${bookingType.toLowerCase()} request</strong>
          from <strong>${senderName}</strong> for ${orderLabel}.
        </p>

        <div style="
          background-color: #fdf0ec;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Action required:</strong> Please review this request and accept or decline it from your dashboard.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Review Request
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, `New ${bookingType} Request from ${senderName}`, emailBody);
};

const sendOrderAcceptedEmail = async ({
  sentTo,
  clientName,
  serviceProviderName,
  orderType,
  serviceType,
  packageName,
}: {
  sentTo: string;
  clientName: string;
  serviceProviderName: string;
  orderType: 'direct' | 'custom';
  serviceType?: string;
  packageName?: string;
}): Promise<void> => {
  const orderLabel =
    orderType === 'direct'
      ? packageName ? `"${packageName}"` : 'your package'
      : `custom ${serviceType || 'booking'}`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Booking Accepted
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${clientName}</strong>,</p>

        <p>
          Great news! <strong>${serviceProviderName}</strong> has <strong>accepted</strong>
          your booking request for <strong>${orderLabel}</strong>.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Next step:</strong> Please complete your payment to confirm the booking.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Complete Payment
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, `Your Booking Has Been Accepted – Complete Payment`, emailBody);
};

const sendPaymentSuccessEmail = async ({
  sentTo,
  receiverName,
  clientName,
  orderType,
  serviceType,
  packageName,
}: {
  sentTo: string;
  receiverName: string;
  clientName: string;
  orderType: 'direct' | 'custom';
  serviceType?: string;
  packageName?: string;
}): Promise<void> => {
  const orderLabel =
    orderType === 'direct'
      ? packageName ? `"${packageName}"` : 'your package'
      : `custom ${serviceType || 'booking'}`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Payment Received – Order In Progress
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${clientName}</strong> has successfully completed payment for
          <strong>${orderLabel}</strong>. The order is now in progress.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Payment confirmed.</strong> You can now start working on the order.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Order
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, 'Payment Received – Your Order Is Now In Progress', emailBody);
};

const sendNewMessageEmail = async ({
  sentTo,
  receiverName,
  senderName,
  messageText,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
  messageText: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          New Message
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>You have received a new message from <strong>${senderName}</strong>.</p>

        <div style="
          background-color: #f4f6fb;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #333;
        ">
          ${messageText}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/messages" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Reply to Message
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, `New Message from ${senderName}`, emailBody);
};

const sendDeliveryAcceptedEmail = async ({
  sentTo,
  receiverName,
  clientName,
  serviceType,
  packageName,
}: {
  sentTo: string;
  receiverName: string;
  clientName: string;
  serviceType?: string;
  packageName?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Delivery Accepted ✅
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          Great news! <strong>${clientName}</strong> has <strong>accepted your delivery</strong>
          for the <strong>${serviceType || 'order'}${packageName ? ` – ${packageName}` : ''}</strong>.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          The order has been successfully completed. Well done!
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Order
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, 'Your Delivery Has Been Accepted', emailBody);
};

const sendCancelRequestDeclinedEmail = async ({
  sentTo,
  receiverName,
  declinedByName,
  serviceType,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  declinedByName: string;
  serviceType?: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Cancellation Request Declined
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${declinedByName}</strong> has <strong>declined</strong> your cancellation request
          for the <strong>${serviceType || 'order'}</strong>.
          The order will continue as previously agreed.
        </p>

        ${reason ? `
        <div style="
          background-color: #fff3f3;
          border-left: 4px solid #e53935;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Reason for decline:</strong><br/>
          ${reason}
        </div>` : ''}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Order
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, 'Your Cancellation Request Has Been Declined', emailBody);
};

const sendCancelRequestEmail = async ({
  sentTo,
  receiverName,
  requesterName,
  serviceType,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  requesterName: string;
  serviceType?: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Cancellation Request Received
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${requesterName}</strong> has requested to cancel the
          <strong>${serviceType || 'order'}</strong>.
          Please review this request and take action.
        </p>

        ${reason ? `
        <div style="
          background-color: #fff8e1;
          border-left: 4px solid #f5a623;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Reason provided:</strong><br/>
          ${reason}
        </div>` : ''}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Review Request
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, 'Cancellation Request – Action Required', emailBody);
};

const sendRefundRequiredEmail = async ({
  sentTo,
  adminName,
  cancellerName,
  orderId,
  serviceType,
}: {
  sentTo: string;
  adminName: string;
  cancellerName: string;
  orderId: string;
  serviceType?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img
          src="${logoUrl}"
          alt="Frafol Logo"
          style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;"
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Refund Required – Order Cancelled
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${adminName}</strong>,</p>

        <p>
          An order has been cancelled and may require a <strong>refund</strong>.
          Please review the details below and take the necessary action.
        </p>

        <div style="
          background-color: #fff3f3;
          border: 1px dashed #e53935;
          padding: 20px;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
            <tr>
              <td style="padding: 6px 0; color: #777;">Order ID</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777;">Cancelled By</td>
              <td style="padding: 6px 0; text-align: right;">${cancellerName}</td>
            </tr>
            ${serviceType ? `
            <tr>
              <td style="padding: 6px 0; color: #777;">Service Type</td>
              <td style="padding: 6px 0; text-align: right;">${serviceType}</td>
            </tr>` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/order-management" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Review Order
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, please contact our support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol System</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; text-align: center; padding: 14px; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Frafol. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(sentTo, 'Refund Required – Order Cancelled', emailBody);
};

export { otpSendEmail, sendBookingNotificationEmail, profileVerifiedEmail, profileDeclinedEmail, passwordChangedEmail, forgotPasswordEmail, bankDetailsChangedEmail, accountBlockedEmail, sendEmailAndNotification, sendFrafolEmail, frafolChoiceRenewalSuccessEmail, frafolChoiceRenewalFailedEmail, frafolChoiceExpiringSoonEmail, frafolChoiceExpiredEmail, sendRefundRequiredEmail, sendCancelRequestEmail, sendCancelRequestDeclinedEmail, sendDeliveryAcceptedEmail, sendNewMessageEmail, sendPaymentSuccessEmail, sendOrderAcceptedEmail, sendBookingRequestEmail, sendCommentOrReplyEmail };
