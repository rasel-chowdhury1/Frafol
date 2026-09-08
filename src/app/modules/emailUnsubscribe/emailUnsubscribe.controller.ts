import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { EmailUnsubscribeService } from "./emailUnsubscribe.service";

const renderPage = (title: string, message: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:40px 16px; text-align:center; color:#333;">
      <div style="max-width:480px; margin:0 auto; background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:32px;">
        <h2 style="margin-top:0; color:#AD2B08;">${title}</h2>
        <p style="font-size:15px; line-height:1.6;">${message}</p>
      </div>
    </body>
  </html>
`;

// GET /api/v1/email/unsubscribe?token=... (manual click from an email client)
const unsubscribeViaLink = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };

  try {
    await EmailUnsubscribeService.unsubscribeFromNotificationEmails(token || "");
    res
      .status(200)
      .send(
        renderPage(
          "You've been unsubscribed",
          "You will no longer receive email notifications for new messages, comments, or replies. You can still manage this anytime from your account settings.",
        ),
      );
  } catch (error) {
    res
      .status(400)
      .send(
        renderPage(
          "Unsubscribe link invalid",
          "This unsubscribe link is invalid or has already been used. Please contact support if you keep receiving unwanted emails.",
        ),
      );
  }
});

// POST /api/v1/email/unsubscribe?token=... (one-click unsubscribe, RFC 8058)
const unsubscribeOneClick = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };

  try {
    await EmailUnsubscribeService.unsubscribeFromNotificationEmails(token || "");
  } catch (error) {
    // One-click unsubscribe must not surface errors to the mail client
  }

  res.status(200).send("OK");
});

export const EmailUnsubscribeController = {
  unsubscribeViaLink,
  unsubscribeOneClick,
};
