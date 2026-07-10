import {
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";


import { SESClient } from "@aws-sdk/client-ses";
import config from "../config";

export const sesClient = new SESClient({
  region: config.smtp.region,

  credentials: {
    accessKeyId: config.smtp.accessKeyId,
    secretAccessKey: config.smtp.secretAccessKey,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    console.log("Mail sending started...");

    const params: SendEmailCommandInput = {
      Source: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,

      Destination: {
        ToAddresses: [to],
      },

      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },

        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
        },
      },
    };

    await sesClient.send(new SendEmailCommand(params));

    console.log("Mail sent successfully.");
  } catch (error) {
    console.error("Send mail error:", error);
  }

  console.log("Mail sending finished.");
};