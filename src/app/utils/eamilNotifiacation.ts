import { emitNotification } from "../../socketIo";
import { getAdminData } from "../DB/adminStrore";
import { sendEmail } from "./mailSender";
import { EmailUnsubscribeService } from "../modules/emailUnsubscribe/emailUnsubscribe.service";
import { generateFrafolChoiceInvoicePdf } from "./invoicePdfGenerator";

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
  vatAmount?: number;
  currency?: string;
  purchaseDate?: string;
  expiryDate?: string;
  // invoice billing / payment fields
  transactionId?: string;
  paymentMethod?: string;
  companyName?: string;
  ICO?: string;
  DIC?: string;
  IC_DPH?: string;
  streetAddress?: string;
  town?: string;
  country?: string;
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
  vatAmount?: number;
  currency?: string;
  purchaseDate?: string;
  expiryDate?: string;
  transactionId?: string;
  paymentMethod?: string;
  companyName?: string;
  ICO?: string;
  DIC?: string;
  IC_DPH?: string;
  streetAddress?: string;
  town?: string;
  country?: string;
}

const logoUrl = 'https://res.cloudinary.com/dns84qf2p/image/upload/v1768557807/frafolLogo_vftuvh.png'; // Use Frafol domain
const primaryColor = '#AD2B08';
const supportEmail = 'cvak@frafol.sk';

const clientUrl = process.env.FRONT_URL || "http://76.13.133.178:3000";



const emailFooter = () => `
  <div style="background-color: #f5f5f5; padding: 16px 24px; border-top: 1px solid #e0e0e0;">
    <p style="margin: 0 0 8px 0; text-align: center; font-size: 12px; color: #777;">&copy; ${new Date().getFullYear()} Frafol. Všetky práva vyhradené.</p>
    <p style="margin: 0; font-size: 11px; color: #999; line-height: 1.6;">
      Spracúvanie osobných údajov: Radi by sme Vás informovali, že spracúvame Vaše osobné údaje v súlade s Nariadením Európskeho parlamentu a Rady (EÚ) č. 2016/679 a v súlade s príslušnými slovenskými právnymi predpismi, najmä zákonom č. 18/2018 Z. z. Bližšie informácie nájdete na našej webovej stránke: <a href="${clientUrl}/data-protection" style="color: #999; text-decoration: underline;">GDPR</a>. V prípade ak máte akékoľvek otázky, neváhajte nás kontaktovať na adrese: <a href="mailto:gdpr@frafol.sk" style="color: #999; text-decoration: none;">gdpr@frafol.sk</a>.
    </p>
  </div>`;

const supportEmailSection = () => `
        <p style="margin-top: 24px; font-size: 14px;">
          Ak potrebujete pomoc, kontaktujte nás na
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>
        `;

const regardsSection = () => `
        <p style="margin-top: 32px;">
          S pozdravom<br />
          Frafol
        </p>
`

const policiesSection = () => `
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />

      <p style="font-size: 14px; color: #555;">
        Prečítajte si naše dokumenty:
      </p>

      <ul style="font-size: 14px; color: #555; padding-left: 20px;">
        <li>
          <a href="${clientUrl}/terms-of-service-marketplace" style="color: ${primaryColor}; text-decoration: none;">
            Všeobecné obchodné podmienky Online trh
          </a>
        </li>
        <li>
          <a href="${clientUrl}/terms-of-service" style="color: ${primaryColor}; text-decoration: none;">
            Všeobecné obchodné podmienky Zmluvné vzťahy
          </a>
        </li>
        <li>
          <a href="${clientUrl}/data-protection" style="color: ${primaryColor}; text-decoration: none;">
            GDPR
          </a>
        </li>
      </ul>`;

// Notification-style emails (new message / comment / reply) are the only
// ones that should carry an unsubscribe option — transactional emails
// (OTP, password reset, payment confirmations, etc.) never get one.
//
// NOTE: we intentionally do NOT send our own List-Unsubscribe /
// List-Unsubscribe-Post headers here. Brevo's SMTP relay injects its own
// List-Unsubscribe header on every email it sends (transactional and
// notification alike) regardless of what headers the app provides, and a
// click on Gmail's one-click button is handled entirely on Brevo's side —
// it blocklists the contact for ALL transactional sends on this account,
// not just this one. Our own header therefore had no effect on Gmail's
// button and only risked producing a duplicate/conflicting header, so it
// was removed. The in-app opt-out below (link -> our own
// /api/v1/email/unsubscribe endpoint -> User.emailNotificationsEnabled)
// is the real, working per-user control for these two notification emails
// and is unaffected by Brevo's own unsubscribe/blocklist behavior.
const notificationUnsubscribeFooter = (receiverId: string) => {
  const unsubscribeUrl = EmailUnsubscribeService.getUnsubscribeUrl(receiverId);
  return `
    <p style="margin: 16px 0 0; font-size: 11px; color: #999; text-align: center;">
      You're receiving this because someone interacted with your content on Frafol.
      <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a> from these notification emails.
    </p>`;
};

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
          Jednorazový overovací kód
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň <strong>${name}</strong>,</p>

        <p>
          na dokončenie overenia použite nasledujúci jednorazový kód. Tento kód je platný len obmedzený čas.
        </p>

        <div style="
          background-color: #f4f6fb;
          border: 1px dashed ${primaryColor};
          padding: 20px;
          text-align: center;
          border-radius: 6px;
          margin: 24px 0;
        ">
          <p style="margin: 0; font-size: 14px; color: #555;">Váš overovací kód</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: ${primaryColor}; letter-spacing: 4px;">
            ${otp}
          </p>
        </div>

        <p style="font-size: 14px; color: #666;">
          Platnosť kódu vyprší:<br />
          <strong>${expiredAt.toLocaleString()}</strong>
        </p>

        ${supportEmailSection()}

        ${policiesSection()}

        ${regardsSection()}

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
      <p style="margin: 0 0 12px 0; line-height: 1.5;">
        Váš účet bol úspešne vytvorený. Náš tím momentálne kontroluje váš profil.
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
        <strong>Prebieha overovanie profilu</strong><br/>
        Váš profil práve overuje náš tím. Po dokončení overenia vám pošleme potvrdzovací e-mail.
      </div>`
      : `
      <p style="margin: 0 0 12px 0; line-height: 1.5;">
        ${userType === "professional_verified"
          ? "Váš profil bol úspešne overený. Klienti Vás teraz môžu nájsť a objednať si Vaše služby."
          : "Váš účet bol úspešne vytvorený. Tešíme sa, že ste sa k nám pripojili."}
      </p>
      <p style="margin: 0 0 12px 0; line-height: 1.5;">
        Na začiatok si pozrite, ako naša platforma funguje: 
      </p>
      <p style="margin: 12px 0; line-height: 1.5;">
        <a href="${howItWorksLink}" style="
          display: inline-block;
          padding: 12px 20px;
          background-color: ${primaryColor};
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
        ">
          Ako to funguje
        </a>
      </p>`;

  const emailBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

    <!-- Header -->
    <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
      <img src="${logoUrl}" alt="FRAFOL PROFILE PICTURE" style="max-width: 150px; margin-bottom: 12px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
        Vitajte vo Frafole 🎉
      </h1>
    </div>

    <div style="padding: 24px; color: #333; line-height: 1.5;">
      <p style="margin: 0 0 12px 0; line-height: 1.5;">
        Dobrý deň <strong>${name}</strong>,
      </p>

      <p style="margin: 0 0 12px 0; line-height: 1.5;">
        Vitajte vo <strong>Frafole!</strong>
      </p>

      ${dynamicSection}

      ${policiesSection()}

      ${supportEmailSection()}

      ${regardsSection()}
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
          Profil overený ✅
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${name}</strong>,</p><br/>

        <p>
          máme pre vás dobrú správu! Náš tím úspešne overil váš profesionálny profil na Frafole.
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
            Váš účet je teraz aktívny
          </p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #555;">
            Teraz môžete dokončiť svoj profil a začať prijímať objednávky.
          </p>
        </div>

        <p style="font-size: 14px; color: #555;">
          <strong>Ďalší krok:</strong> Nahrajte svoje portfólio, aby si klienti mohli pozrieť vašu prácu a kontaktovať vás.
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
            Nahrať portfólio
          </a>
        </div>

        <p style="font-size: 14px; color: #666;">
          Kompletný profil s ukážkami Vašej práce a podrobnými informáciami Vám pomôže získať viac rezervácií.
        </p>

        ${supportEmailSection()}

        ${regardsSection()}
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
        <p>Dobrý deň <strong>${userName}</strong>,</p>

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

      ${supportEmailSection()}

        ${policiesSection()}

      ${regardsSection()}

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
        <p>Dobrý deň,  <strong>${userName}</strong>,</p>

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
  vatAmount = 0,
  currency = 'EUR',
  purchaseDate,
  expiryDate,
  transactionId,
  paymentMethod,
  companyName,
  ICO,
  DIC,
  IC_DPH,
  streetAddress,
  town,
  country,
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
      <p>Dobrý deň,  <strong>${name}</strong>,</p>
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
        Your official invoice is attached to this email as a PDF. Please keep it for your records.
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

  let attachments: { filename: string; content: Buffer; contentType?: string }[] | undefined;
  try {
    if (amount !== undefined && orderId) {
      const pdfBuffer = await generateFrafolChoiceInvoicePdf({
        invoiceNumber: orderId,
        invoiceDate: purchaseDate || new Date().toLocaleDateString('en-GB'),
        transactionId: transactionId || orderId,
        paymentMethod,
        professionalName: name,
        companyName,
        ICO,
        DIC,
        IC_DPH,
        streetAddress,
        town,
        country,
        planDays: planDays || 0,
        basePrice: amount - vatAmount,
        vatAmount,
        totalPrice: amount,
        currency,
      });
      attachments = [
        { filename: `Frafol-Choice-Invoice-${orderId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
      ];
    }
  } catch (err) {
    console.error('❌ Failed to generate Frafol Choice invoice PDF:', err);
  }

  await sendEmail(sentTo, 'Frafol Choice Activated – Order Confirmation', emailBody, undefined, attachments);
};


const sendEmailAndNotification = (params: SendEmailNotificationParams) => {
  const {
    userId, email, name, notificationText, orderId, planName, planDays, amount, vatAmount,
    currency, purchaseDate, expiryDate, transactionId, paymentMethod, companyName,
    ICO, DIC, IC_DPH, streetAddress, town, country,
  } = params;

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
      vatAmount,
      currency,
      purchaseDate,
      expiryDate,
      transactionId,
      paymentMethod,
      companyName,
      ICO,
      DIC,
      IC_DPH,
      streetAddress,
      town,
      country,
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
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Aktualizácia overenia profilu</h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${name}</strong>,</p>

        <p>
          ďakujeme, že ste odoslali svoj profil tvorcu na <strong>Frafole</strong>.
          Po jeho kontrole vás, žiaľ, musíme informovať, že váš profil nebol schválený.
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
          <strong>Dôvod zamietnutia:</strong><br/>
          ${reason}
        </div>

        <p style="font-size: 14px; color: #555;">
          Ak si myslíte, že ide o chybu, alebo nám chcete poskytnúť ďalšie informácie, kontaktujte nás na
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>

        <p style="margin-top: 32px;">
          S pozdravom,<br />
          <strong>Frafol</strong>
        </p>
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Overenie profilu bolo zamietnuté', emailBody);
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
        <p>Dobrý deň,  <strong>${name}</strong>,</p>
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
        <p>Dobrý deň,  <strong>${name}</strong>,</p>
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
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bankové údaje boli aktualizované</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${name}</strong>,</p>
        <p>vaše bankové údaje na <strong>Frafole</strong> boli úspešne aktualizované.</p>
        <div style="background-color: #fff8e1; border-left: 4px solid #f5a623; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          Ak ste túto zmenu nevykonali vy, okamžite nás kontaktujte na
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </div>

        <p style="margin-top: 32px;">S pozdravom,<br /><strong>Frafol</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;
  await sendEmail(sentTo, 'Bankové údaje boli zmenené', emailBody);
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
        <p>Dobrý deň,  <strong>${name}</strong>,</p>
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

const accountDeleteRequestAdminEmail = async ({
  sentTo,
  name,
  reason,
}: {
  sentTo: string;
  name?: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img 
          src="${logoUrl}" 
          alt="Frafol Logo" 
          style="max-width: 150px; margin-bottom: 12px;" 
        />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
          Account Deletion Request
        </h1>
      </div>

      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  Admin,</p>

        <p>
          <strong>${name}</strong> has requested to delete their Frafol account.
        </p>

        ${
          reason
            ? `
          <div style="background-color: #fff8e1; border-left: 4px solid #f9a825; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
            <strong>Reason:</strong><br/>
            ${reason}
          </div>
        `
            : ''
        }

        <p style="font-size: 14px; color: #555;">
          Please review the account deletion request and take the appropriate action from the admin panel.
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

  await sendEmail(
    sentTo,
    'New Account Deletion Request',
    emailBody,
  );
};

const accountDeleteRejectedEmail = async ({
  sentTo,
  name,
  reason,
}: {
  sentTo: string;
  name: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Account Deletion Request Declined</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${name}</strong>,</p>
        <p>
          Your request to delete your Frafol account has been reviewed by our admin team and
          has been <strong>declined</strong>. Your account remains active.
        </p>
        ${reason ? `
        <div style="background-color: #fff3f3; border-left: 4px solid #e53935; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          <strong>Reason:</strong><br/>${reason}
        </div>` : ''}
        <p style="font-size: 14px; color: #555;">
          If you have any questions or would like to submit a new request, please contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Best regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;
  await sendEmail(sentTo, 'Your Account Deletion Request Was Declined', emailBody);
};

const frafolChoiceRenewalSuccessEmail = async ({
  sentTo,
  name,
  orderId,
  planName,
  planDays,
  amount,
  vatAmount = 0,
  currency = 'EUR',
  purchaseDate,
  expiryDate,
  transactionId,
  paymentMethod,
  companyName,
  ICO,
  DIC,
  IC_DPH,
  streetAddress,
  town,
  country,
}: FrafolChoiceEmailParams): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Frafol Choice Renewed ✅</h1>
    </div>
    <div style="padding:24px;color:#333;">
      <p>Dobrý deň,  <strong>${name}</strong>,</p>
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
      <p style="font-size:13px;color:#777;">Your official invoice for this renewal is attached to this email as a PDF. Please keep it for your records.</p>

      ${policiesSection()}

      <p style="margin-top:24px;font-size:14px;">Questions? <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a></p>
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    ${emailFooter()}
  </div>`;

  let attachments: { filename: string; content: Buffer; contentType?: string }[] | undefined;
  try {
    if (amount !== undefined && orderId) {
      const pdfBuffer = await generateFrafolChoiceInvoicePdf({
        invoiceNumber: orderId,
        invoiceDate: purchaseDate || new Date().toLocaleDateString('en-GB'),
        transactionId: transactionId || orderId,
        paymentMethod,
        professionalName: name,
        companyName,
        ICO,
        DIC,
        IC_DPH,
        streetAddress,
        town,
        country,
        planDays: planDays || 0,
        basePrice: amount - vatAmount,
        vatAmount,
        totalPrice: amount,
        currency,
      });
      attachments = [
        { filename: `Frafol-Choice-Invoice-${orderId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
      ];
    }
  } catch (err) {
    console.error('❌ Failed to generate Frafol Choice renewal invoice PDF:', err);
  }

  await sendEmail(sentTo, 'Frafol Choice Renewed – Payment Confirmation', emailBody, undefined, attachments);
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
      <p>Dobrý deň,  <strong>${name}</strong>,</p>
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
      <p>Dobrý deň,  <strong>${name}</strong>,</p>
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
      <p>Dobrý deň,  <strong>${name}</strong>,</p>
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

const frafolChoiceCancelledByAdminEmail = async ({
  sentTo,
  name,
  reason,
}: {
  sentTo: string;
  name: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;background-color:#fff;">
    <div style="background-color:${primaryColor};text-align:center;padding:24px;">
      <img src="${logoUrl}" alt="Frafol Logo" style="max-width:150px;display:block;margin:0 auto 12px;" />
      <h1 style="color:#fff;margin:0;font-size:22px;">Frafol Choice Cancelled</h1>
    </div>
    <div style="padding:24px;color:#333;">
      <p>Dobrý deň,  <strong>${name}</strong>,</p>
      <p>Your <strong>Frafol Choice</strong> subscription has been <strong>cancelled by our admin team</strong>. Your profile has returned to standard visibility.</p>
      ${reason ? `
      <div style="background-color:#fff3f3;border-left:4px solid #e53935;padding:14px 18px;border-radius:4px;margin:20px 0;font-size:14px;color:#555;">
        <strong>Reason:</strong><br/>${reason}
      </div>` : ''}
      <div style="background-color:#fff3f3;border-left:4px solid #e53935;padding:14px 18px;border-radius:4px;margin:20px 0;font-size:14px;color:#555;">
        <strong>You have lost access to:</strong>
        <ul style="margin:8px 0 0;padding-left:16px;">
          <li>Highlighted profile &amp; priority ranking</li>
          <li>Featured visibility on the Frafol homepage</li>
          <li>Frafol Choice badge on your profile</li>
        </ul>
      </div>
      <p style="font-size:14px;color:#555;">
        If you believe this is a mistake, please contact us at
        <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.
      </p>
      ${policiesSection()}
      <p style="margin-top:32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
    </div>
    ${emailFooter()}
  </div>`;
  await sendEmail(sentTo, 'Your Frafol Choice Subscription Has Been Cancelled', emailBody);
};

const sendCommentOrReplyEmail = async ({
  sentTo,
  receiverId,
  receiverName,
  actorName,
  communityTitle,
  commentText,
  isReply,
}: {
  sentTo: string;
  receiverId: string;
  receiverName: string;
  actorName: string;
  communityTitle: string;
  commentText: string;
  isReply: boolean;
}): Promise<void> => {
  const action = isReply ? 'replied to a comment on' : 'komentoval';
  const subject = isReply ? 'New Reply on Your Post' : 'Nový komentár k vášmu príspevku';

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
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${actorName}</strong> ${action} váš príspevok
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
          <a href="${clientUrl}/forums" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Zobraziť príspevok
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          Ak máte akékoľvek otázky, kontaktujte nás na
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>


        <p style="margin-top: 32px;">
          S pozdravom,<br />
          <strong>Frafol</strong>
        </p>

        ${notificationUnsubscribeFooter(receiverId)}
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
    : `Custom ${serviceType?.trim() || 'service'}`;

  const headerLevel = isDirectBooking ? "Nová objednávka balíka" : "Nový dopyt na fotenie alebo natáčanie"

  const message = isDirectBooking ? `používateľ <strong>${senderName}</strong> si objednal váš balík ${orderLabel}` : `používateľ <strong>${senderName}</strong> vám poslal nový dopyt s podrobnosťami o ${orderLabel}.`

  const actionRequired = isDirectBooking? 'Skontrolujte podrobnosti objednávky a prijmite alebo zamietnite ju vo svojom účte.' : 'Pozrite si jeho požiadavky a pripravte mu ponuku na mieru.'

  const btnName = isDirectBooking?'Zobraziť objednávku': 'Zobraziť dopyt';


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
          ${headerLevel}
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

        <p>
          ${message}
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
          <strong>${actionRequired}</strong>
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
            ${btnName}
          </a>
        </div>

        ${supportEmailSection()}
        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Nový dopyt od používateľa ${senderName}`, emailBody);
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
          Objednávka bola prijatá
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${clientName}</strong>,</p>

        <p>
          tvorca <strong>${serviceProviderName}</strong> prijal vašu objednávku služby <strong>${orderLabel}</strong>.
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
          <strong>Ďalší krok: </strong> Dokončite platbu a potvrďte tak objednávku.
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
            Dokončiť platbu
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Vaša objednávka bola prijatá – dokončite platbu`, emailBody);
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
          Objednávka bola zaplatená
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          používateľ <strong>${clientName}</strong> úspešne zaplatil za objednávku služby <strong>${orderLabel}</strong>.
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
          <strong>Objednávka je potvrdená.</strong> Môžete sa začať pripravovať na jej realizáciu.
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
            Zobraziť objednávku
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Objednávka bola zaplatená', emailBody);
};

const sendNewMessageEmail = async ({
  sentTo,
  receiverId,
  receiverName,
  senderName,
  messageText,
}: {
  sentTo: string;
  receiverId: string;
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
          Nová správa
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>dostali ste novú správu od používateľa <strong>${senderName}</strong>.</p>

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
          <a href="${clientUrl}/message" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Odpovedať na správu
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          Ak máte akékoľvek otázky, kontaktujte nás na 
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">
            ${supportEmail}
          </a>.
        </p>

        <p style="margin-top: 32px;">
          S pozdravom,<br />
          <strong>Frafol</strong>
        </p>

        ${notificationUnsubscribeFooter(receiverId)}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(
    sentTo,
    `Nová správa od ${senderName}`,
    emailBody,
  );
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
          Objednávka bola úspešne dokončená ✅
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          máme dobrú správu! Klient <strong>${clientName}</strong> potvrdil prevzatie objednávky <strong>${serviceType || 'order'}${packageName ? ` – ${packageName}` : ''}</strong>. Peniaze vám budú odoslané na bankový účet uvedený vo vašom profile do 15 kalendárnych dní.
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
          Objednávka bola úspešne dokončená. Skvelá práca!
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
            Zobraziť objednávku
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Klient potvrdil prevzatie objednávky', emailBody);
};

const sendReviewRequestEmail = async ({
  sentTo,
  receiverName,
  serviceProviderName,
  serviceType,
  packageName,
}: {
  sentTo: string;
  receiverName: string;
  serviceProviderName: string;
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
          How Was Your Experience? ⭐
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

        <p>
          Your order with <strong>${serviceProviderName}</strong>
          for the <strong>${serviceType || 'order'}${packageName ? ` – ${packageName}` : ''}</strong>
          has been marked as delivered.
        </p>

        <div style="
          background-color: #f4f6fb;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555;
        ">
          We'd love to hear about your experience. Please take a moment to leave a review for <strong>${serviceProviderName}</strong> — it helps other clients and supports our community of professionals.
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/my-account/reviews?tab=pendingReviews" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Leave a Review
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

  await sendEmail(sentTo, `How Was Your Experience with ${serviceProviderName}?`, emailBody);
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
          Žiadosť o zrušenie bola zamietnutá
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          tvorca <strong>${declinedByName}</strong> zamietol vašu žiadosť o zrušenie objednávky <strong>${serviceType || 'order'}</strong>. Objednávka bude pokračovať podľa pôvodnej dohody.
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
            Zobraziť objednávku
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Vaša žiadosť o zrušenie bola zamietnutá', emailBody);
};

const sendCancelRequestEmail = async ({
  sentTo,
  receiverName,
  requesterName,
  serviceType,
  reason,
  receiverRole
}: {
  sentTo: string;
  receiverName: string;
  requesterName: string;
  serviceType?: string;
  reason?: string;
  receiverRole: string;
}): Promise<void> => {

  const reviewRequestUrl =
    receiverRole === 'serviceProvider'
      ? `${clientUrl}/dashboard/professional/event-orders?tab=cancelRequest`
      : `${clientUrl}/dashboard/my-account/orders?tab=cancelRequest`;

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
          Klient požiadal o zrušenie objednávky
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          klient <strong>${requesterName}</strong> požiadal o zrušenie objednávky <strong>${serviceType || 'order'}</strong>. Pozrite si jeho žiadosť a rozhodnite, či ju schválite alebo zamietnete.
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
          <strong>Dôvod zrušenia:</strong><br/>
          ${reason}
        </div>` : ''}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${reviewRequestUrl}" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Odpovedať na žiadosť
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Žiadosť o zrušenie objednávky – vyžaduje sa odpoveď', emailBody);
};

const sendRefundRequiredEmail = async ({
  sentTo,
  adminName,
  cancellerName,
  orderId,
  serviceType,
  customerEmail,
  paidAmount,
}: {
  sentTo: string;
  adminName: string;
  cancellerName: string;
  orderId: string;
  serviceType?: string;
  customerEmail?: string;
  paidAmount?: number;
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
        <p>Dobrý deň,  <strong>${adminName}</strong>,</p>

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
            ${customerEmail ? `
            <tr>
              <td style="padding: 6px 0; color: #777;">Customer Email</td>
              <td style="padding: 6px 0; text-align: right;">${customerEmail}</td>
            </tr>` : ''}
            ${paidAmount !== undefined ? `
            <tr>
              <td style="padding: 6px 0; color: #777;">Paid Amount</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #e53935;">${paidAmount.toFixed(2)} EUR</td>
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
  deliveryLink,
  deliveryMessage,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
  orderType: 'direct' | 'custom';
  serviceType?: string;
  packageName?: string;
  deliveryLink: string;
  deliveryMessage?: string;
}): Promise<void> => {
  const orderLabel =
    orderType === 'direct'
      ? packageName
        ? `"${packageName}"`
        : 'your order'
      : `custom ${serviceType || 'booking'}`;

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
        ">
          Objednávka je pripravená
        </h1>
      </div>

      <!-- Body -->
      <div style="
        padding: 24px;
        color: #333333;
      ">

        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          Vaše fotografie alebo video od tvorcu <strong>${senderName}</strong> sú pripravené! Pozrite si objednávku <strong>${orderLabel}</strong> a potvrďte jej prevzatie.
        </p>

        ${
          deliveryMessage
            ? `
              <div style="
                background-color: #f8f8f8;
                border-left: 4px solid ${primaryColor};
                padding: 14px 18px;
                border-radius: 4px;
                margin: 20px 0;
                font-size: 14px;
                color: #555555;
              ">
                <strong>Message from ${senderName}:</strong>
                <p style="
                  margin: 8px 0 0;
                  line-height: 1.6;
                ">
                  ${deliveryMessage}
                </p>
              </div>
            `
            : ''
        }

        <!-- Delivery Link -->
        <div style="
          background-color: #fdf0ec;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555555;
        ">
          <strong>Delivery link:</strong>

          <p style="
            margin: 8px 0 0;
            word-break: break-all;
          ">
            <a
              href="${deliveryLink}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                color: ${primaryColor};
                text-decoration: none;
              "
            >
              ${deliveryLink}
            </a>
          </p>
        </div>

        <!-- Action Required -->
        <div style="
          background-color: #fdf0ec;
          border-left: 4px solid ${primaryColor};
          padding: 14px 18px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
          color: #555555;
        ">
          Po prezretí objednávky potvrďte jej prevzatie alebo ju zamietnite vo svojom profile.
        </div>

        <!-- Open Delivery Link -->
        <div style="
          text-align: center;
          margin: 28px 0 16px;
        ">
          <a
            href="${deliveryLink}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display: inline-block;
              padding: 12px 22px;
              background-color: ${primaryColor};
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: bold;
            "
          >
            View Delivered Files
          </a>
        </div>

        <!-- Review Delivery -->
        <div style="
          text-align: center;
          margin: 16px 0 28px;
        ">
          <a
            href="${clientUrl}/dashboard/my-account/orders?tab=toConfirm"
            style="
              display: inline-block;
              padding: 12px 22px;
              background-color: #ffffff;
              color: ${primaryColor};
              border: 1px solid ${primaryColor};
              text-decoration: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: bold;
            "
          >
            Pozrieť objednávku
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}

      </div>

      ${emailFooter()}

    </div>
  `;

  await sendEmail(
    sentTo,
    'Vaše fotografie alebo video sú pripravené!',
    emailBody,
  );
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
          Žiadosť o predĺženie termínu
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          <strong>${senderName}</strong> požiadal o predĺženie termínu odovzdania <strong>${serviceType || 'order'}</strong>.
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
          <strong>Dôvod: </strong> ${reason}
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
            Odpovedať na žiadosť
          </a>
        </div>

        ${supportEmailSection()}
        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Žiadosť o predĺženie termínu', emailBody);
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
          Predĺženie termínu schválené
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          klient <strong>${senderName}</strong> schválil vašu žiadosť o predĺženie termínu objednávky <strong>${serviceType || 'order'}</strong>.
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
          <strong>Nový termín odovzdania: </strong> ${dateStr}
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
            Zobraziť objednávku
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Predĺženie termínu schválené', emailBody);
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
          Žiadosť o predĺženie termínu zamietnutá
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          klient <strong>${senderName}</strong> zamietol vašu žiadosť o predĺženie termínu objednávky pre <strong>${serviceType || 'order'}</strong>.
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
          <strong>Dôvod: </strong> ${reason}
        </div>` : ''}

        ${supportEmailSection()}

        ${regardsSection()}

      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Žiadosť o predĺženie termínu zamietnutá', emailBody);
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
    ? 'Klient požiadal o úpravu objednávky'
    : 'Vaša žiadosť o ponuku na mieru bola zamietnutá';

  const orderLabel =
    orderType === 'direct'
      ? packageName || serviceType || 'order'
      : `custom ${serviceType || 'booking'}`;

  const bodyText = isDeliveryDeclined
    ? `klient <strong>${senderName}</strong> požiadal o úpravu objednávky <strong>${orderLabel}</strong>. Po vykonaní úprav ju môžete vo svojom profile znova odovzdať.`
    : `tvorca <strong>${senderName}</strong> zamietol vašu žiadosť o <strong>${orderLabel}</strong>.`;

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
          ${isDeliveryDeclined ? 'Klient požiadal o úpravu objednávky' : 'Žiadosť bola zamietnutá'}
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

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
            ? `<strong>Dôvod zamietnutia: </strong> ${reason}`
            : isDeliveryDeclined
              ? 'Prečítajte si spätnú väzbu a pred opätovným odoslaním dodanie upravte.'
              : 'Ak máte otázky alebo si myslíte, že ide o omyl, kontaktujte nás.'}
        </div>

        

        ${isDeliveryDeclined ? `
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/event-orders?tab=inProgress" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            Upraviť objednávku
          </a>
        </div>` : ''}

        ${supportEmailSection()}

        ${regardsSection()}
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
          Objednávka zrušená
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          tvorca <strong>${senderName}</strong> schválil vašu žiadosť o zrušenie objednávky 
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
          Ak máte otázky týkajúce sa zrušenia objednávky, kontaktujte nás.
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Objednávka bola zrušená`, emailBody);
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
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

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
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

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

const sendGearOrderPayoutCompletedEmail = async ({
  sentTo,
  receiverName,
  orderId,
  itemName,
  netAmount,
  currency = 'EUR',
}: {
  sentTo: string;
  receiverName: string;
  orderId: string;
  itemName?: string;
  netAmount?: number;
  currency?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Payment Processed ✅</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          Your payment for the gear order${itemName ? ` <strong>"${itemName}"</strong>` : ''} (Order ID: <strong>${orderId}</strong>)
          has been processed and marked as completed by our team.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          ${netAmount !== undefined
            ? `<strong>Payout Amount:</strong> ${netAmount.toFixed(2)} ${currency}`
            : 'Your payout for this order has been confirmed.'}
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/gear-orders" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Order</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Payment Processed – Order ${orderId}`, emailBody);
};

const sendEventOrderPayoutCompletedEmail = async ({
  sentTo,
  receiverName,
  orderId,
  orderType,
  serviceType,
  packageName,
  netAmount,
  currency = 'EUR',
}: {
  sentTo: string;
  receiverName: string;
  orderId: string;
  orderType: 'direct' | 'custom';
  serviceType?: string;
  packageName?: string;
  netAmount?: number;
  currency?: string;
}): Promise<void> => {
  const orderLabel = orderType === 'direct'
    ? packageName || serviceType || 'order'
    : `custom ${serviceType || 'booking'}`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Payment Processed ✅</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          Your payment for the <strong>${orderLabel}</strong> (Order ID: <strong>${orderId}</strong>) has been
          processed and marked as completed by our team.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          ${netAmount !== undefined
            ? `<strong>Payout Amount:</strong> ${netAmount.toFixed(2)} ${currency}`
            : 'Your payout for this order has been confirmed.'}
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/event-orders" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Order</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Payment Processed – Order ${orderId}`, emailBody);
};

const sendWorkshopPayoutCompletedEmail = async ({
  sentTo,
  receiverName,
  orderId,
  workshopTitle,
  amount,
  currency = 'EUR',
}: {
  sentTo: string;
  receiverName: string;
  orderId: string;
  workshopTitle?: string;
  amount?: number;
  currency?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Payment Processed ✅</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          Your payment for the workshop${workshopTitle ? ` <strong>"${workshopTitle}"</strong>` : ''} (Order ID: <strong>${orderId}</strong>)
          has been processed and marked as completed by our team.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          ${amount !== undefined
            ? `<strong>Payout Amount:</strong> ${amount.toFixed(2)} ${currency}`
            : 'Your payout for this workshop has been confirmed.'}
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/workshop" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Workshop</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Payment Processed – Order ${orderId}`, emailBody);
};

const sendGearDeliveryRequestEmail = async ({
  sentTo,
  receiverName,
  senderName,
  itemName,
}: {
  sentTo: string;
  receiverName: string;
  senderName: string;
  itemName?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Delivery Request</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          <strong>${senderName}</strong> has marked your gear order${itemName ? ` <strong>"${itemName}"</strong>` : ''} as shipped/delivered.
          Please confirm once you've received it.
        </p>
        <div style="background-color: #fdf0ec; border-left: 4px solid ${primaryColor}; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          <strong>Action required:</strong> Please review and confirm or decline this delivery from your dashboard.
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/my-account/gear-order?tab=toConfirm" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">Review Delivery</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Gear Order Delivery – Please Confirm Receipt', emailBody);
};

const sendGearDeliveryAcceptedEmail = async ({
  sentTo,
  receiverName,
  clientName,
  itemName,
}: {
  sentTo: string;
  receiverName: string;
  clientName: string;
  itemName?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Delivery Accepted ✅</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          Great news! <strong>${clientName}</strong> has confirmed receipt of the gear order${itemName ? ` <strong>"${itemName}"</strong>` : ''}.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          The order has been successfully completed. Well done!
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/gear-orders" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Order</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Your Gear Delivery Has Been Accepted', emailBody);
};

const sendGearDeliveryDeclinedEmail = async ({
  sentTo,
  receiverName,
  clientName,
  itemName,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  clientName: string;
  itemName?: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Delivery Declined</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          <strong>${clientName}</strong> has declined the delivery for the gear order${itemName ? ` <strong>"${itemName}"</strong>` : ''}.
        </p>
        <div style="background-color: #fff3f3; border-left: 4px solid #e53935; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          <strong>Reason:</strong> ${reason || 'No reason provided.'}
        </div>
        <p style="font-size: 14px; color: #555;">
          Please review the details and resend the delivery once resolved.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/gear-orders" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Order</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Gear Order Delivery Declined', emailBody);
};

const sendGearOrderCancelledEmail = async ({
  sentTo,
  receiverName,
  cancelledByName,
  itemName,
  reason,
}: {
  sentTo: string;
  receiverName: string;
  cancelledByName: string;
  itemName?: string;
  reason?: string;
}): Promise<void> => {
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Gear Order Cancelled</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          We're sorry to inform you that your gear order${itemName ? ` <strong>"${itemName}"</strong>` : ''} has been cancelled by <strong>${cancelledByName}</strong>.
        </p>
        <div style="background-color: #fff3f3; border-left: 4px solid #e53935; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          <strong>Reason:</strong> ${reason || 'No reason provided.'}
        </div>
        <p style="font-size: 14px; color: #555;">
          If a payment was already made, our team will review and process a refund where applicable.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/my-account/gear-order?tab=cancelled" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Orders</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, 'Your Gear Order Has Been Cancelled', emailBody);
};

const sendGearOrderSoldEmail = async ({
  sentTo,
  receiverName,
  clientName,
  items,
}: {
  sentTo: string;
  receiverName: string;
  clientName: string;
  items: { orderId: string; itemName: string; price: number }[];
}): Promise<void> => {
  const itemRows = items.map((i) => `
    <tr>
      <td style="padding:6px 0;color:#333;">${i.itemName}</td>
      <td style="padding:6px 0;color:#777;text-align:center;">${i.orderId}</td>
      <td style="padding:6px 0;text-align:right;font-weight:bold;">${i.price.toFixed(2)} EUR</td>
    </tr>`).join('');

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${primaryColor}; text-align: center; padding: 24px;">
        <img src="${logoUrl}" alt="Frafol Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">New Order – Product Sold! 🎉</h1>
      </div>
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>
        <p>
          Great news! <strong>${clientName}</strong> just purchased ${items.length > 1 ? 'the following gear items' : 'your gear item'} from your marketplace listing.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
          <thead>
            <tr style="background-color:#f5f5f5;">
              <th style="padding:8px;text-align:left;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Item</th>
              <th style="padding:8px;text-align:center;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Order ID</th>
              <th style="padding:8px;text-align:right;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555;">
          Please prepare the item(s) for delivery and update the order status from your dashboard once shipped.
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/gear-order" style="display: inline-block; padding: 12px 22px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">View Order</a>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you have any questions, contact us at
          <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.
        </p>
        ${policiesSection()}
        <p style="margin-top: 32px;">Kind regards,<br /><strong>Frafol Team</strong></p>
      </div>
      ${emailFooter()}
    </div>
  `;

  const subject = items.length > 1
    ? `New Order – ${items.length} Items Sold!`
    : `New Order – "${items[0]?.itemName || 'Gear Item'}" Sold!`;

  await sendEmail(sentTo, subject, emailBody);
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
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

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
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

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
          <a href="${clientUrl}/dashboard/professional/workshop?tab=approved" style="
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

const sendWorkshopNewParticipantEmail = async ({
  sentTo,
  receiverName,
  participantName,
  workshopTitle,
  workshopDate,
  workshopTime,
}: {
  sentTo: string;
  receiverName: string;
  participantName: string;
  workshopTitle: string;
  workshopDate?: string;
  workshopTime?: string;
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
          New Workshop Participant! 🎉
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

        <p>
          Great news! <strong>${participantName}</strong> has joined your workshop
          <strong>"${workshopTitle}"</strong> as a participant.
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
          ${workshopDate ? `<strong>Date:</strong> ${workshopDate}${workshopTime ? ` at ${workshopTime}` : ''}` : 'Payment has been received and the seat is now confirmed.'}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${clientUrl}/dashboard/professional/workshop" style="
            display: inline-block;
            padding: 12px 22px;
            background-color: ${primaryColor};
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
          ">
            View Workshop
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

  await sendEmail(sentTo, `New Participant Joined: "${workshopTitle}"`, emailBody);
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
          Balík bol schválený
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333;">
        <p>Dobrý deň, <strong>${receiverName}</strong>,</p>

        <p>
          váš balík <strong>"${packageTitle}"</strong> bol schválený naším tímom a je teraz zverejnený na Frafole.
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
          Balík je viditeľný pre zákazníkov a pripravený na prijímanie rezervácií.
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
            Zobraziť balík
          </a>
        </div>

        ${supportEmailSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, `Váš balík "${packageTitle}" bol schválený`, emailBody);
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
        <p>Dobrý deň,  <strong>${receiverName}</strong>,</p>

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
  recipientName?: string;
  orderId: string;
  orderType: 'direct' | 'custom';
  title: string;
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
  invoiceType?: 'payment' | 'completed';
  invoiceUrl: string;
}

const sendEventOrderInvoiceEmail = async (params: EventOrderInvoiceParams): Promise<void> => {
  const {
    sentTo, customerName, recipientName, orderId, orderType, title, serviceType, packageName,
    eventDate, eventTime, location, price, serviceFee, vatAmount = 0,
    couponCode, couponDiscount = 0, totalPrice, transactionId, paymentMethod,
    paymentDate, streetAddress, town, country, isRegisterAsCompany,
    companyName, ICO, DIC, IC_DPH, serviceProviderName, invoiceType = 'payment',invoiceUrl
  } = params;

  const isCompleted = invoiceType === 'completed';
  const headerTitle = isCompleted ? 'Order Completed Successfully ✅' : 'Payment Confirmation &amp; Invoice';
  const introText = isCompleted
    ? 'Your order has been completed successfully. Please find the invoice for your records below.'
    : 'Your payment has been successfully processed. Please find your invoice below.';
  const emailSubject = isCompleted
    ? `Order Completed – Invoice ${orderId} | Frafol`
    : `Invoice – Order ${orderId} | Frafol`;

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
        <h1 style="color:#ffffff;margin:0;font-size:22px;">${headerTitle}</h1>
      </div>

      <div style="padding:28px;color:#333;">
        <p>Dobrý deň,  <strong>${recipientName || customerName}</strong>,</p>
        <p>${introText}</p>

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
              <td style="padding:5px 0;color:#777;">Service Title</td>
              <td style="padding:5px 0;text-align:right;font-weight:bold;">${title}</td>
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


        <div style="text-align:center;margin:28px 0;">
          <a
            href="${invoiceUrl}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-block;
              background-color:${primaryColor};
              color:#ffffff;
              text-decoration:none;
              padding:12px 24px;
              border-radius:6px;
              font-size:14px;
              font-weight:bold;
            "
          >
            View Invoice
          </a>
        </div>

        <p style="font-size:12px;color:#999;margin-top:8px;">This email serves as your official invoice. Please keep it for your records.</p>

        ${policiesSection()}

        ${regardsSection()}
      </div>

      ${emailFooter()}
    </div>
  `;

  await sendEmail(sentTo, emailSubject, emailBody);
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
  invoiceUrl: string;
}

const sendWorkshopInvoiceEmail = async (params: WorkshopInvoiceParams): Promise<void> => {
  const {
    sentTo, customerName, workshopTitle, workshopDate, workshopTime,
    location, locationType, basePrice, vatPercent = 0, vatAmount, totalPrice,
    orderId, transactionId, paymentDate, streetAddress, town, country,
    isRegisterAsCompany, companyName, ICO, DIC, IC_DPH, instructorName,invoiceUrl
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
        <p>Dobrý deň,  <strong>${customerName}</strong>,</p>
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

                <div style="text-align:center;margin:28px 0;">
          <a
            href="${invoiceUrl}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-block;
              background-color:${primaryColor};
              color:#ffffff;
              text-decoration:none;
              padding:12px 24px;
              border-radius:6px;
              font-size:14px;
              font-weight:bold;
            "
          >
            View Invoice
          </a>
        </div>

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
  invoiceUrl: string;
}

const sendGearOrderInvoiceEmail = async (params: GearOrderInvoiceParams): Promise<void> => {
  const {
    sentTo, customerName, items, subtotal, totalShipping, totalAmount,
    transactionId, paymentDate, shippingAddress, postCode, town,
    loginAsCompany, companyName, ico, dic, ic_dph,invoiceUrl
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
        <p>Dobrý deň,  <strong>${customerName}</strong>,</p>
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


        <div style="text-align:center;margin:28px 0;">
          <a
            href="${invoiceUrl}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-block;
              background-color:${primaryColor};
              color:#ffffff;
              text-decoration:none;
              padding:12px 24px;
              border-radius:6px;
              font-size:14px;
              font-weight:bold;
            "
          >
            View Invoice
          </a>
        </div>

        <p style="font-size:12px;color:#999;margin-top:8px;">This email serves as your official invoice. Please keep it for your records.</p>

        ${policiesSection()}

        ${regardsSection()}
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
  accountDeleteRequestAdminEmail,
  accountDeleteRejectedEmail,
  sendEmailAndNotification, 
  sendFrafolEmail, 
  frafolChoiceRenewalSuccessEmail, 
  frafolChoiceRenewalFailedEmail, 
  frafolChoiceExpiringSoonEmail, 
  frafolChoiceExpiredEmail,
  frafolChoiceCancelledByAdminEmail,
  sendRefundRequiredEmail, 
  sendCancelRequestEmail, 
  sendCancelRequestDeclinedEmail, 
  sendDeliveryAcceptedEmail,
  sendReviewRequestEmail,
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
  sendGearOrderPayoutCompletedEmail,
  sendWorkshopPayoutCompletedEmail,
  sendEventOrderPayoutCompletedEmail,
  sendGearDeliveryRequestEmail,
  sendGearDeliveryAcceptedEmail,
  sendGearDeliveryDeclinedEmail,
  sendGearOrderCancelledEmail,
  sendGearOrderSoldEmail,
  sendWorkshopDeclinedEmail,
  sendWorkshopApprovedEmail,
  sendWorkshopNewParticipantEmail,
  sendPackageApprovedEmail, 
  sendPackageDeclinedEmail, 
  sendEventOrderInvoiceEmail, 
  sendWorkshopInvoiceEmail, 
  sendGearOrderInvoiceEmail 
};
