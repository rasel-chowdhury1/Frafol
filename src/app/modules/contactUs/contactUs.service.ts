
import httpStatus from "http-status";
import AppError from "../../error/AppError";
import { sendEmail } from "../../utils/mailSender";
import config from "../../config";

const contactUs = async (payload: { name: string; email: string; message: string }) => {
  const { name, email, message } = payload;

  if (!name || !email || !message) {
    throw new AppError(httpStatus.BAD_REQUEST, "All fields (name, email, message) are required");
  }

  try {
    const html = `
      <div style="font-family: Arial">
        <h3>📩 New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <br />
        <small>This message was received from your website contact form.</small>
      </div>
    `;


    console.log("Contact Us Email:", config.admin_email as string);
    // Send email to admin
    await sendEmail(
      config.admin_email as string,
      `New Contact Message from ${name}`,
      html
    );

    return {
      message: "Your message has been sent successfully",
    };
  } catch (error) {
    console.log("Contact Us Email Error:", error);

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to send message. Please try again later."
    );
  }
};

export const ContactService = {
  contactUs,
};
