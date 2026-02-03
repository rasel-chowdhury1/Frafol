import { getChannel } from './index';
import { sendEmail } from '../utils/mailSender';

// Producer
export const sendEmailJob = async (to: string, subject: string, html: string) => {
  const channel = getChannel();
  const queue = 'emailQueue';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({ to, subject, html })), {
    persistent: true
  });
};

// Consumer
export const startEmailConsumer = async () => {
  const channel = getChannel();
  const queue = 'emailQueue';
  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg: any) => {
    if (!msg) return;
    const { to, subject, html } = JSON.parse(msg.content.toString());

    try {
      await sendEmail(to, subject, html);
      channel.ack(msg);
    } catch (err) {
      console.error('Email failed:', err);
      // retry করার জন্য msg ack করা হবে না
    }
  });
};
