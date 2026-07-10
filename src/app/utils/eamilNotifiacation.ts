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
const supportEmail = 'cvak@frafol.sk';

const clientUrl = process.env.FRONT_URL || "http://76.13.133.178:3000";



const emailFooter = () => `
  <div style="background-color: #f5f5f5; padding: 16px 24px; border-top: 1px solid #e0e0e0;">
    <p style="margin: 0 0 8px 0; text-align: center; font-size: 12px; color: #777;">&copy; ${new Date().getFullYear()} Frafol. All rights reserved.</p>
    <p style="margin: 0; font-size: 11px; color: #999; line-height: 1.6;">
      Spracúvanie osobných údajov: Radi by sme Vás informovali, že spracúvame Vaše osobné údaje v súlade s Nariadením Európskeho parlamentu a Rady (EÚ) č. 2016/679 a v súlade s príslušnými slovenskými právnymi predpismi, najmä zákonom č. 18/2018 Z. z. Bližšie informácie nájdete na našej webovej stránke: <a href="${clientUrl}/data-protection" style="color: #999; text-decoration: underline;">GDPR</a>. V prípade ak máte akékoľvek otázky, neváhajte nás kontaktovať na adrese: <a href="mailto:gdpr@frafol.sk" style="color: #999; text-decoration: none;">gdpr@frafol.sk</a>.
    </p>
  </div>`;

const policiesSection = () => `
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />

      <p style="font-size: 14px; color: #555;">
        Please review our policies:
      </p>

      <ul style="font-size: 14px; color: #555; padding-left: 20px;">
        <li>
          <a href="${clientUrl}/terms-of-service-marketplace" style="color: ${primaryColor}; text-decoration: none;">
            Terms &amp; Conditions (Marketplace)
          </a>
        </li>
        <li>
          <a href="${clientUrl}/terms-of-service" style="color: ${primaryColor}; text-decoration: none;">
            Terms &amp; Conditions (Conceptual)
          </a>
        </li>
        <li>
          <a href="${clientUrl}/data-protection" style="color: ${primaryColor}; text-decoration: none;">
            GDPR &amp; Data Protection Policy
          </a>
        </li>
      </ul>`;

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
          If you didn't request this code or need assistance, please contact our
          support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong><br />
          Frafol
        </p>
      </div>

      ${emailFooter()}
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
          : "Your account has been successfully created. We're excited to have you on board."}
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
      <img src="${logoUrl}" alt="FRAFOL PROFILE PICTURE" style="max-width: 150px; margin-bottom: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
        Welcome to Frafol 🎉
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 24px; color: #333;">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Welcome to <strong>Frafol</strong>!</p>
      ${dynamicSection}

      ${policiesSection()}

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

    ${emailFooter()}
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>The Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}

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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, subject, emailBody);
};

const sendBookingDeclineEmail = async ({
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
          Booking Request Declined
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${userName}</strong>,</p>

        <p>We're sorry to inform you that your booking request on <strong>Frafol</strong> has been declined. Please see the details below.</p>

        <div style="
          background-color: #fdf0ec;
          border: 1px dashed ${primaryColor};
          padding: 20px;
          text-align: center;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <p style="margin: 0; font-size: 14px; color: #555;">Decline Details</p>
          <p style="margin: 10px 0 0; font-size: 15px; color: #333333; line-height: 1.6;">
            ${messageText}
          </p>
        </div>

        <p style="font-size: 14px; color: #555;">
          Log in to your Frafol account to view more details or explore other options.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Dashboard
          </a>
        </div>

        <p style="margin-top: 24px; font-size: 14px;">
          If you have any questions, please contact our support team at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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

      <p style="font-size:13px;color:#777;margin-top:16px;">
        This email serves as your invoice / payment confirmation. Please keep it for your records.
      </p>

      ${policiesSection()}

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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}

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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Best regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
        ${policiesSection()}
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
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
        ${policiesSection()}
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
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
        ${policiesSection()}
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
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
        ${policiesSection()}
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
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

      ${policiesSection()}

      <p style="margin-top:24px;font-size:14px;">Questions? <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a></p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    ${emailFooter()}
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
      ${policiesSection()}
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    ${emailFooter()}
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
      ${policiesSection()}
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    ${emailFooter()}
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
      ${policiesSection()}
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    ${emailFooter()}
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
          <a href="${clientUrl}/dashboard/professional/event-orders" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
          <a href="${clientUrl}/dashboard/my-account/orders" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
          <a href="${clientUrl}/dashboard/professional/event-orders" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
          <a href="${clientUrl}/dashboard/professional/event-orders?tab=delivered" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
          <a href="${clientUrl}/dashboard/my-account/orders?tab=currentOrder" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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
          <a href="${clientUrl}/dashboard/my-account/orders?tab=cancelRequest" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol System</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Refund Required – Order Cancelled', emailBody);
};

const sendDeliveryRequestEmail = async ({
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
  const orderLabel =
    orderType === 'direct'
      ? packageName ? `"${packageName}"` : 'your order'
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
          Delivery Request Received
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${senderName}</strong> has submitted a delivery for
          <strong>${orderLabel}</strong>. Please review and confirm.
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
          <strong>Action required:</strong> Please review the delivery and confirm or decline it from your dashboard.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/my-account/orders?tab=toConfirm" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Review Delivery
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Delivery Request Received – Action Required', emailBody);
};

const sendExtensionRequestEmail = async ({
  sentTo,
  receiverName,
  senderName,
  serviceType,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
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
          Delivery Date Extension Requested
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${senderName}</strong> has requested a delivery date extension
          for the <strong>${serviceType || 'order'}</strong>.
        </p>

        ${reason ? `
        <div style="
          background-color: #fdf0ec;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Reason:</strong> ${reason}
        </div>` : ''}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/my-account/extension-requests" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Delivery Date Extension Requested', emailBody);
};

const sendExtensionAcceptedEmail = async ({
  sentTo,
  receiverName,
  senderName,
  serviceType,
  newDeliveryDate,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
  serviceType?: string;
  newDeliveryDate?: Date;
}): Promise<void> => {
  const dateStr = newDeliveryDate
    ? new Date(newDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'the new agreed date';

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
          Extension Request Accepted
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${senderName}</strong> has accepted your delivery date extension request
          for the <strong>${serviceType || 'order'}</strong>.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #16a34a;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>New delivery date:</strong> ${dateStr}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/event-orders" style="
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

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Delivery Date Extension Accepted', emailBody);
};

const sendExtensionRejectedEmail = async ({
  sentTo,
  receiverName,
  senderName,
  serviceType,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
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
          Extension Request Rejected
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${senderName}</strong> has rejected your delivery date extension request
          for the <strong>${serviceType || 'order'}</strong>.
        </p>

        ${reason ? `
        <div style="
          background-color: #fdf0ec;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          <strong>Reason:</strong> ${reason}
        </div>` : ''}

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Delivery Date Extension Rejected', emailBody);
};

const sendOrderDeclinedEmail = async ({
  sentTo,
  receiverName,
  senderName,
  orderType,
  serviceType,
  packageName,
  status,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
  orderType: 'direct' | 'custom';
  serviceType?: string;
  packageName?: string;
  status: 'declined' | 'deliveryRequestDeclined';
  reason?: string;
}): Promise<void> => {
  const isDeliveryDeclined = status === 'deliveryRequestDeclined';

  const subject = isDeliveryDeclined
    ? 'Delivery Request Declined'
    : 'Order Request Declined';

  const orderLabel =
    orderType === 'direct'
      ? packageName || serviceType || 'order'
      : `custom ${serviceType || 'booking'}`;

  const bodyText = isDeliveryDeclined
    ? `<strong>${senderName}</strong> has declined the delivery request for your <strong>${orderLabel}</strong>. You can revise and resubmit the delivery from your dashboard.`
    : `<strong>${senderName}</strong> has declined your <strong>${orderLabel}</strong> request.`;

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
          ${isDeliveryDeclined ? 'Delivery Request Declined' : 'Order Request Declined'}
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>${bodyText}</p>

        <div style="
          background-color: #fdf0ec;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          ${reason
            ? `<strong>Reason:</strong> ${reason}`
            : isDeliveryDeclined
              ? 'Please review the feedback and update your delivery before resubmitting.'
              : 'If you have questions or believe this was a mistake, please contact us.'}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}${isDeliveryDeclined ? '/dashboard/professional/event-orders?tab=inProgress' : ''}" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Go to Dashboard
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, subject, emailBody);
};

const sendOrderCancelledEmail = async ({
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
  const orderLabel =
    orderType === 'direct'
      ? packageName || serviceType || 'order'
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
          Order Cancelled
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${senderName}</strong> has cancelled the
          <strong>${orderLabel}</strong>.
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
          If you have any questions about this cancellation, please contact us.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/event-orders?tab=cancelled" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Go to Dashboard
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Order Cancelled: ${orderLabel}`, emailBody);
};

const sendGearMarketplaceApprovedEmail = async ({
  sentTo,
  receiverName,
  itemName,
}: {
  sentTo: string;
  receiverName: string;
  itemName: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Gear Item Approved!</h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          Congratulations! Your gear item <strong>"${itemName}"</strong> has been
          approved by our admin team and is now live on the Frafol marketplace.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #16a34a;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          Your item is now visible to buyers and ready to receive orders.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/gear-marketPlace" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Your Listing
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Gear Item Approved: "${itemName}"`, emailBody);
};

const sendGearMarketplaceDeclinedEmail = async ({
  sentTo,
  receiverName,
  itemName,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  itemName: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">

      <!-- Header -->
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Gear Item Declined</h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          We're sorry to inform you that your gear item
          <strong>"${itemName}"</strong> has been declined by our admin team.
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
          ${reason ? `<strong>Reason:</strong> ${reason}` : 'Please review our listing guidelines and resubmit if appropriate.'}
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Gear Item Declined: "${itemName}"`, emailBody);
};

const sendWorkshopDeclinedEmail = async ({
  sentTo,
  receiverName,
  workshopTitle,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  workshopTitle: string;
  reason: string;
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
          Workshop Declined
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          We're sorry to inform you that your workshop
          <strong>"${workshopTitle}"</strong> has been declined by our admin team.
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
          <strong>Reason:</strong> ${reason}
        </div>

        <p style="font-size: 14px; color: #555;">
          If you believe this decision was made in error or have any questions,
          please contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Workshop Declined: "${workshopTitle}"`, emailBody);
};

const sendWorkshopApprovedEmail = async ({
  sentTo,
  receiverName,
  workshopTitle,
}: {
  sentTo: string;
  receiverName: string;
  workshopTitle: string;
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
          Workshop Approved!
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          Congratulations! Your workshop <strong>"${workshopTitle}"</strong> has been
          approved by our admin team and is now live on Frafol.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #16a34a;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          Your workshop is now visible to participants and ready to accept bookings.
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
            View Your Workshop
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Workshop Approved: "${workshopTitle}"`, emailBody);
};

const sendPackageApprovedEmail = async ({
  sentTo,
  receiverName,
  packageTitle,
}: {
  sentTo: string;
  receiverName: string;
  packageTitle: string;
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
          Package Approved!
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          Congratulations! Your package <strong>"${packageTitle}"</strong> has been
          approved by our admin team and is now live on Frafol.
        </p>

        <div style="
          background-color: #f0fdf4;
          border-left: 4px solid #16a34a;
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          Your package is now visible to clients and ready to accept bookings.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/packages" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Your Package
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Package Approved: "${packageTitle}"`, emailBody);
};

const sendPackageDeclinedEmail = async ({
  sentTo,
  receiverName,
  packageTitle,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  packageTitle: string;
  reason: string;
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
          Package Declined
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Hello <strong>${receiverName}</strong>,</p>

        <p>
          We're sorry to inform you that your package
          <strong>"${packageTitle}"</strong> has been declined by our admin team.
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
          <strong>Reason:</strong> ${reason}
        </div>

        <p style="font-size: 14px; color: #555;">
          If you believe this decision was made in error or have any questions,
          please contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        ${policiesSection()}

        <p style="margin-top: 32px;">
          Kind regards,<br />
          <strong>Frafol Team</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Package Declined: "${packageTitle}"`, emailBody);
};

// ─────────────────────────────────────────────
// INVOICE EMAILS
// ─────────────────────────────────────────────

interface EventOrderInvoiceParams {
  sentTo: string;
  customerName: string;
  orderId: string;
  orderType: 'direct' | 'custom';
  serviceType: string;
  packageName?: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  price: number;
  serviceFee: number;
  vatAmount?: number;
  couponCode?: string;
  couponDiscount?: number;
  totalPrice: number;
  transactionId: string;
  paymentMethod: string;
  paymentDate: string;
  streetAddress?: string;
  town?: string;
  country?: string;
  isRegisterAsCompany?: boolean;
  companyName?: string;
  ICO?: string;
  DIC?: string;
  IC_DPH?: string;
  serviceProviderName?: string;
}

const sendEventOrderInvoiceEmail = async (params: EventOrderInvoiceParams): Promise<void> => {
  const {
    sentTo, customerName, orderId, orderType, serviceType, packageName,
    eventDate, eventTime, location, price, serviceFee, vatAmount = 0,
    couponCode, couponDiscount = 0, totalPrice, transactionId, paymentMethod,
    paymentDate, streetAddress, town, country, isRegisterAsCompany,
    companyName, ICO, DIC, IC_DPH, serviceProviderName,
  } = params;

  const orderLabel = orderType === 'direct'
    ? `Direct Booking${packageName ? ` – ${packageName}` : ''}`
    : `Custom ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Booking`;

  const billingRows = isRegisterAsCompany ? `
    <tr><td style="padding:4px 8px;color:#777;font-size:13px;">Company</td><td style="padding:4px 8px;font-size:13px;">${companyName || ''}</td></tr>
    ${ICO ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">ICO</td><td style="padding:4px 8px;font-size:13px;">${ICO}</td></tr>` : ''}
    ${DIC ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">DIC</td><td style="padding:4px 8px;font-size:13px;">${DIC}</td></tr>` : ''}
    ${IC_DPH ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">IC DPH</td><td style="padding:4px 8px;font-size:13px;">${IC_DPH}</td></tr>` : ''}
  ` : '';

  const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#ffffff;">

      <div style="background-color:${primaryColor};text-align:center;padding:24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
        <h1 style="color:#ffffff;margin:0;font-size:22px;">Payment Confirmation &amp; Invoice</h1>
      </div>

      <div style="padding:28px;color:#333;">
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your payment has been successfully processed. Please find your invoice below.</p>

        <!-- Invoice Header -->
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#777;">Invoice / Order ID</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Transaction ID</td>
            <td style="padding:4px 0;text-align:right;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Payment Date</td>
            <td style="padding:4px 0;text-align:right;">${paymentDate}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Payment Method</td>
            <td style="padding:4px 0;text-align:right;text-transform:capitalize;">${paymentMethod}</td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />

        <!-- Billing Info -->
        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Bill To</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 8px;color:#777;font-size:13px;">Name</td><td style="padding:4px 8px;font-size:13px;">${customerName}</td></tr>
          ${streetAddress ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">Address</td><td style="padding:4px 8px;font-size:13px;">${streetAddress}${town ? ', ' + town : ''}${country ? ', ' + country : ''}</td></tr>` : ''}
          ${billingRows}
        </table>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />

        <!-- Order Details -->
        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Order Details</p>
        <div style="background-color:#fdf0ec;border:1px solid ${primaryColor};border-radius:6px;padding:16px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr>
              <td style="padding:5px 0;color:#777;">Order Type</td>
              <td style="padding:5px 0;text-align:right;font-weight:bold;">${orderLabel}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#777;">Service Type</td>
              <td style="padding:5px 0;text-align:right;text-transform:capitalize;">${serviceType}</td>
            </tr>
            ${serviceProviderName ? `<tr><td style="padding:5px 0;color:#777;">Service Provider</td><td style="padding:5px 0;text-align:right;">${serviceProviderName}</td></tr>` : ''}
            <tr>
              <td style="padding:5px 0;color:#777;">Event Date</td>
              <td style="padding:5px 0;text-align:right;">${eventDate}${eventTime ? ' at ' + eventTime : ''}</td>
            </tr>
            ${location ? `<tr><td style="padding:5px 0;color:#777;">Location</td><td style="padding:5px 0;text-align:right;">${location}</td></tr>` : ''}
          </table>
        </div>

        <!-- Price Breakdown -->
        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Price Breakdown</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">Base Price</td>
            <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${price.toFixed(2)} EUR</td>
          </tr>
          ${serviceFee > 0 ? `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">Service Fee</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${serviceFee.toFixed(2)} EUR</td></tr>` : ''}
          ${vatAmount > 0 ? `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">VAT</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${vatAmount.toFixed(2)} EUR</td></tr>` : ''}
          ${couponDiscount > 0 ? `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#2e7d32;">Coupon Discount${couponCode ? ' (' + couponCode + ')' : ''}</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#2e7d32;">-${couponDiscount.toFixed(2)} EUR</td></tr>` : ''}
          <tr>
            <td style="padding:10px 0;font-weight:bold;font-size:16px;color:${primaryColor};">Total Paid</td>
            <td style="padding:10px 0;font-weight:bold;font-size:16px;text-align:right;color:${primaryColor};">${totalPrice.toFixed(2)} EUR</td>
          </tr>
        </table>

        <p style="font-size:12px;color:#999;margin-top:8px;">This email serves as your official invoice. Please keep it for your records.</p>

        ${policiesSection()}

        <p style="margin-top:24px;font-size:14px;">
          Questions? Contact us at <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.
        </p>
        <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Invoice – Order ${orderId} | Frafol`, emailBody);
};

interface WorkshopInvoiceParams {
  sentTo: string;
  customerName: string;
  workshopTitle: string;
  workshopDate: string;
  workshopTime: string;
  location?: string;
  locationType?: string;
  basePrice: number;
  vatPercent?: number;
  vatAmount: number;
  totalPrice: number;
  orderId: string;
  transactionId: string;
  paymentDate: string;
  streetAddress?: string;
  town?: string;
  country?: string;
  isRegisterAsCompany?: boolean;
  companyName?: string;
  ICO?: string;
  DIC?: string;
  IC_DPH?: string;
  instructorName?: string;
}

const sendWorkshopInvoiceEmail = async (params: WorkshopInvoiceParams): Promise<void> => {
  const {
    sentTo, customerName, workshopTitle, workshopDate, workshopTime,
    location, locationType, basePrice, vatPercent = 0, vatAmount, totalPrice,
    orderId, transactionId, paymentDate, streetAddress, town, country,
    isRegisterAsCompany, companyName, ICO, DIC, IC_DPH, instructorName,
  } = params;

  const billingRows = isRegisterAsCompany ? `
    <tr><td style="padding:4px 8px;color:#777;font-size:13px;">Company</td><td style="padding:4px 8px;font-size:13px;">${companyName || ''}</td></tr>
    ${ICO ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">ICO</td><td style="padding:4px 8px;font-size:13px;">${ICO}</td></tr>` : ''}
    ${DIC ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">DIC</td><td style="padding:4px 8px;font-size:13px;">${DIC}</td></tr>` : ''}
    ${IC_DPH ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">IC DPH</td><td style="padding:4px 8px;font-size:13px;">${IC_DPH}</td></tr>` : ''}
  ` : '';

  const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#ffffff;">

      <div style="background-color:${primaryColor};text-align:center;padding:24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
        <h1 style="color:#ffffff;margin:0;font-size:22px;">Workshop Registration Invoice</h1>
      </div>

      <div style="padding:28px;color:#333;">
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your workshop registration is confirmed. Here is your invoice.</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#777;">Order ID</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Transaction ID</td>
            <td style="padding:4px 0;text-align:right;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Payment Date</td>
            <td style="padding:4px 0;text-align:right;">${paymentDate}</td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />

        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Bill To</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 8px;color:#777;font-size:13px;">Name</td><td style="padding:4px 8px;font-size:13px;">${customerName}</td></tr>
          ${streetAddress ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">Address</td><td style="padding:4px 8px;font-size:13px;">${streetAddress}${town ? ', ' + town : ''}${country ? ', ' + country : ''}</td></tr>` : ''}
          ${billingRows}
        </table>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />

        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Workshop Details</p>
        <div style="background-color:#fdf0ec;border:1px solid ${primaryColor};border-radius:6px;padding:16px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr>
              <td style="padding:5px 0;color:#777;">Workshop</td>
              <td style="padding:5px 0;text-align:right;font-weight:bold;">${workshopTitle}</td>
            </tr>
            ${instructorName ? `<tr><td style="padding:5px 0;color:#777;">Instructor</td><td style="padding:5px 0;text-align:right;">${instructorName}</td></tr>` : ''}
            <tr>
              <td style="padding:5px 0;color:#777;">Date &amp; Time</td>
              <td style="padding:5px 0;text-align:right;">${workshopDate} at ${workshopTime}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#777;">Format</td>
              <td style="padding:5px 0;text-align:right;text-transform:capitalize;">${locationType || 'In-person'}</td>
            </tr>
            ${location ? `<tr><td style="padding:5px 0;color:#777;">Location / Link</td><td style="padding:5px 0;text-align:right;">${location}</td></tr>` : ''}
          </table>
        </div>

        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Price Breakdown</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">Base Price</td>
            <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${basePrice.toFixed(2)} EUR</td>
          </tr>
          ${vatAmount > 0 ? `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">VAT${vatPercent > 0 ? ' (' + vatPercent + '%)' : ''}</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${vatAmount.toFixed(2)} EUR</td></tr>` : ''}
          <tr>
            <td style="padding:10px 0;font-weight:bold;font-size:16px;color:${primaryColor};">Total Paid</td>
            <td style="padding:10px 0;font-weight:bold;font-size:16px;text-align:right;color:${primaryColor};">${totalPrice.toFixed(2)} EUR</td>
          </tr>
        </table>

        <p style="font-size:12px;color:#999;margin-top:8px;">This email serves as your official invoice. Please keep it for your records.</p>

        ${policiesSection()}

        <p style="margin-top:24px;font-size:14px;">
          Questions? Contact us at <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.
        </p>
        <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Workshop Invoice – ${workshopTitle} | Frafol`, emailBody);
};

interface GearInvoiceItem {
  name: string;
  orderId: string;
  basePrice: number;
  vatAmount: number;
  totalPrice: number;
  shippingCost: number;
  condition: string;
}

interface GearOrderInvoiceParams {
  sentTo: string;
  customerName: string;
  items: GearInvoiceItem[];
  subtotal: number;
  totalShipping: number;
  totalAmount: number;
  transactionId: string;
  paymentDate: string;
  shippingAddress?: string;
  postCode?: string;
  town?: string;
  loginAsCompany?: boolean;
  companyName?: string;
  ico?: string;
  dic?: string;
  ic_dph?: string;
}

const sendGearOrderInvoiceEmail = async (params: GearOrderInvoiceParams): Promise<void> => {
  const {
    sentTo, customerName, items, subtotal, totalShipping, totalAmount,
    transactionId, paymentDate, shippingAddress, postCode, town,
    loginAsCompany, companyName, ico, dic, ic_dph,
  } = params;

  const itemRows = items.map((item, i) => `
    <tr style="background-color:${i % 2 === 0 ? '#fafafa' : '#ffffff'};">
      <td style="padding:10px 8px;font-size:13px;border-bottom:1px solid #f0f0f0;">
        <strong>${item.name}</strong><br/>
        <span style="color:#777;font-size:12px;">Order: ${item.orderId} &bull; Condition: ${item.condition}</span>
      </td>
      <td style="padding:10px 8px;font-size:13px;border-bottom:1px solid #f0f0f0;text-align:right;">${item.basePrice.toFixed(2)} EUR</td>
      <td style="padding:10px 8px;font-size:13px;border-bottom:1px solid #f0f0f0;text-align:right;">${item.vatAmount.toFixed(2)} EUR</td>
      <td style="padding:10px 8px;font-size:13px;border-bottom:1px solid #f0f0f0;text-align:right;">${item.shippingCost.toFixed(2)} EUR</td>
      <td style="padding:10px 8px;font-size:13px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;">${item.totalPrice.toFixed(2)} EUR</td>
    </tr>
  `).join('');

  const billingRows = loginAsCompany ? `
    <tr><td style="padding:4px 8px;color:#777;font-size:13px;">Company</td><td style="padding:4px 8px;font-size:13px;">${companyName || ''}</td></tr>
    ${ico ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">ICO</td><td style="padding:4px 8px;font-size:13px;">${ico}</td></tr>` : ''}
    ${dic ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">DIC</td><td style="padding:4px 8px;font-size:13px;">${dic}</td></tr>` : ''}
    ${ic_dph ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">IC DPH</td><td style="padding:4px 8px;font-size:13px;">${ic_dph}</td></tr>` : ''}
  ` : '';

  const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#ffffff;">

      <div style="background-color:${primaryColor};text-align:center;padding:24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
        <h1 style="color:#ffffff;margin:0;font-size:22px;">Marketplace Order Invoice</h1>
      </div>

      <div style="padding:28px;color:#333;">
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your marketplace purchase is confirmed. Here is your invoice.</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#777;">Transaction ID</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Payment Date</td>
            <td style="padding:4px 0;text-align:right;">${paymentDate}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#777;">Items Purchased</td>
            <td style="padding:4px 0;text-align:right;">${items.length}</td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />

        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Ship To</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 8px;color:#777;font-size:13px;">Name</td><td style="padding:4px 8px;font-size:13px;">${customerName}</td></tr>
          ${shippingAddress ? `<tr><td style="padding:4px 8px;color:#777;font-size:13px;">Address</td><td style="padding:4px 8px;font-size:13px;">${shippingAddress}${postCode ? ', ' + postCode : ''}${town ? ', ' + town : ''}</td></tr>` : ''}
          ${billingRows}
        </table>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;" />

        <p style="font-weight:bold;font-size:14px;margin-bottom:8px;">Items Ordered</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background-color:#f5f5f5;">
              <th style="padding:8px;text-align:left;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Item</th>
              <th style="padding:8px;text-align:right;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Base</th>
              <th style="padding:8px;text-align:right;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">VAT</th>
              <th style="padding:8px;text-align:right;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Shipping</th>
              <th style="padding:8px;text-align:right;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;">
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">Items Subtotal</td>
            <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${subtotal.toFixed(2)} EUR</td>
          </tr>
          ${totalShipping > 0 ? `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;color:#555;">Total Shipping</td><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${totalShipping.toFixed(2)} EUR</td></tr>` : ''}
          <tr>
            <td style="padding:10px 0;font-weight:bold;font-size:16px;color:${primaryColor};">Total Paid</td>
            <td style="padding:10px 0;font-weight:bold;font-size:16px;text-align:right;color:${primaryColor};">${totalAmount.toFixed(2)} EUR</td>
          </tr>
        </table>

        <p style="font-size:12px;color:#999;margin-top:8px;">This email serves as your official invoice. Please keep it for your records.</p>

        ${policiesSection()}

        <p style="margin-top:24px;font-size:14px;">
          Questions? Contact us at <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.
        </p>
        <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Marketplace Invoice – ${items.length} Item${items.length !== 1 ? 's' : ''} | Frafol`, emailBody);
};

export { 
  otpSendEmail, 
  sendBookingNotificationEmail, 
  profileVerifiedEmail, 
  profileDeclinedEmail, 
  passwordChangedEmail, 
  forgotPasswordEmail, 
  bankDetailsChangedEmail, 
  accountBlockedEmail, 
  sendEmailAndNotification, 
  sendFrafolEmail, 
  frafolChoiceRenewalSuccessEmail, 
  frafolChoiceRenewalFailedEmail, 
  frafolChoiceExpiringSoonEmail, 
  frafolChoiceExpiredEmail, 
  sendRefundRequiredEmail, 
  sendCancelRequestEmail, 
  sendCancelRequestDeclinedEmail, 
  sendDeliveryAcceptedEmail, 
  sendNewMessageEmail, 
  sendPaymentSuccessEmail, 
  sendOrderAcceptedEmail, 
  sendBookingRequestEmail,
  sendBookingDeclineEmail, 
  sendCommentOrReplyEmail, 
  sendDeliveryRequestEmail,
  sendExtensionRequestEmail,
  sendExtensionAcceptedEmail,
  sendExtensionRejectedEmail,
  sendOrderDeclinedEmail,
  sendOrderCancelledEmail,
  sendGearMarketplaceApprovedEmail,
  sendGearMarketplaceDeclinedEmail,
  sendWorkshopDeclinedEmail,
  sendWorkshopApprovedEmail, 
  sendPackageApprovedEmail, 
  sendPackageDeclinedEmail, 
  sendEventOrderInvoiceEmail, 
  sendWorkshopInvoiceEmail, 
  sendGearOrderInvoiceEmail 
};
