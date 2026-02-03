import { getChannel } from './index';
import Notification from '../modules/notifications/notifications.model';
import { io, connectedUsers } from '../../socketIo';
import mongoose, { AnyArray } from 'mongoose';

export const sendNotificationJob = async (payload: any) => {
  const channel = getChannel();
  const queue = 'notificationQueue';
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
    persistent: true
  });
};

export const startNotificationConsumer = async () => {
  const channel = getChannel();
  const queue = 'notificationQueue';
  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg : any) => {
    if (!msg) return;
    const { userId, receiverId, userMsg, type } = JSON.parse(msg.content.toString());

    try {
      // Save to DB
      await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        receiverId: new mongoose.Types.ObjectId(receiverId),
        message: userMsg,
        type,
        isRead: false,
        timestamp: new Date(),
      });

      // Emit socket notification
      const userSocket = connectedUsers.get(receiverId.toString());
      if (userSocket) {
        io.to(userSocket.socketID).emit('notification', {
          message: userMsg,
          success: true,
          statusCode: 200
        });
      }

      channel.ack(msg);
    } catch (err) {
      console.error('Notification failed:', err);
    }
  });
};
