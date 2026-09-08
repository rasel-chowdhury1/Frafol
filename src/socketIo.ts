import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import express, { Application } from 'express';
import httpStatus from 'http-status';
import AppError from './app/error/AppError';
import { verifyToken } from './app/utils/tokenManage';
import config from './app/config';
import { User } from './app/modules/user/user.model';
import mongoose, { Types } from 'mongoose';
import Notification from './app/modules/notifications/notifications.model';
import colors from 'colors';
import { callbackFn } from './app/utils/callbackFn';
import { profileDeclinedEmail, sendBookingNotificationEmail, sendRefundRequiredEmail, sendCancelRequestEmail, sendCancelRequestDeclinedEmail, sendDeliveryAcceptedEmail, sendReviewRequestEmail, sendNewMessageEmail, sendPaymentSuccessEmail, sendOrderAcceptedEmail, sendBookingRequestEmail, sendCommentOrReplyEmail, sendDeliveryRequestEmail, sendExtensionRequestEmail, sendExtensionAcceptedEmail, sendExtensionRejectedEmail, sendOrderDeclinedEmail, sendOrderCancelledEmail, sendGearMarketplaceApprovedEmail, sendGearMarketplaceDeclinedEmail, sendGearPaymentReceivedEmail, sendGearDeliveryRequestEmail, sendGearDeliveryAcceptedEmail, sendGearDeliveryDeclinedEmail, sendGearOrderCancelledEmail, sendGearOrderSoldEmail, sendWorkshopDeclinedEmail, sendWorkshopApprovedEmail, sendPackageApprovedEmail, sendPackageDeclinedEmail } from './app/utils/eamilNotifiacation';
import Chat from './app/modules/chat/chat.model';
import moment from 'moment-timezone';
import Message from './app/modules/message/message.model';
import { ChatService } from './app/modules/chat/chat.service';
import { text } from 'stream/consumers';
import { USER_ROLE } from './app/modules/user/user.constants';

// Define the socket server port
const socketPort: number = parseInt(process.env.SOCKET_PORT || '9020', 10);

const app: Application = express();

declare module 'socket.io' {
  interface Socket {
    user?: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

// Initialize the Socket.IO server
let io: SocketIOServer;

export const connectedUsers = new Map<
  string,
  {
    socketID: string;
  }
>();

export const initSocketIO = async (server: HttpServer): Promise<void> => {
  const { Server } = await import('socket.io');

  io = new Server(server, {
    cors: {
      origin: '*', // Replace with your client's origin
      methods: ['GET', 'POST'],
      allowedHeaders: ['my-custom-header'], // Add any custom headers if needed
      credentials: true,
    },
  });

  // Start the HTTP server on the specified port
  server.listen(socketPort, () => {
    console.log(
      //@ts-ignore
      `---> Socket server is listening on : http://${config.ip}:${config.socket_port}`
        .yellow.bold,
    );
  });

  // Authentication middleware: now takes the token from headers.
  io.use(async (socket: Socket, next: (err?: any) => void) => {
    // Extract token from headers (ensure your client sends it in headers)
    const token =
      (socket.handshake.auth.token as string) ||
      (socket.handshake.headers.token as string) ||
      (socket.handshake.headers.authorization as string);

    if (!token) {
      return next(
        new AppError(
          httpStatus.UNAUTHORIZED,
          'Authentication error: Token missing',
        ),
      );
    }

    // const userDetails = verifyToken({token, access_secret: config.jwt_access_secret as string});

    let userDetails;
    try {
      userDetails = verifyToken({
        token,
        access_secret: config.jwt_access_secret as string,
      });
    } catch (err) {
      console.error('Socket JWT verify error:', err);
      return next(new Error('Authentication error: Invalid token'));
    }

    if (!userDetails) {
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await User.findById(userDetails.userId);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = {
      _id: user._id.toString(), // Convert _id to string if necessary
      name: user.name as string,
      email: user.email,
      role: user.role,
    };
    next();
  });

  io.on('connection', async (socket: Socket) => {
    // =================== try catch 1 start ================
    try {
      // Automatically register the connected user to avoid missing the "userConnected" event.
      if (socket.user && socket.user._id) {
        connectedUsers.set(socket.user._id.toString(), { socketID: socket.id });

        const unreadNotificationCount = await Notification.countDocuments({
          receiverId: socket.user._id,
          isRead: false,
        });

        emitMessage(socket.user._id.toString());

        socket.emit(`notification`, {
              statusCode: 200,
              success: true,
              unreadCount: unreadNotificationCount >= 0 ? unreadNotificationCount : 0,
              timestamp: new Date()
            });


      }



      // (Optional) In addition to auto-registering, you can still listen for a "userConnected" event if needed.
      socket.on('userConnected', ({ userId }: { userId: string }) => {
        connectedUsers.set(userId, { socketID: socket.id });
      });

      //----------------------online array send for front end------------------------//
      io.emit('onlineUser', Array.from(connectedUsers.keys()));

      // ===================== join by user id ================================
      // socket.join(user?._id?.toString());

        socket.on("readNotification", () => {

          if(!socket.user || !socket.user._id) return;

          const objectId = new Types.ObjectId(socket.user._id);

          // 1ï¸âƒ£ Fire-and-forget: mark as read asynchronously
          Notification.updateMany(
            { receiverId: objectId, isRead: false },
            { $set: { isRead: true } }
          ).catch(err => {
            console.error("Error updating notifications:", err);
          });

          // 2ï¸âƒ£ Immediately emit unread count (0)
          socket.emit(`notification`, {
              statusCode: 200,
              success: true,
              unreadCount: 0,
              timestamp: new Date()
            });
        });
      
      // ======= message send ====
      socket.on(
        'send-message',
        async (
          payload: { text: string; images: string[]; chatId: string },
          callback,
        ) => {
          try {
            const { chatId, text, images } = payload;
            if (!chatId) {
              return callbackFn(callback, {
                success: false,
                message: 'chatId is required',
              });
            }

            // âœ… Validate chat exists
            const chat = await Chat.findById(chatId).select('users');
            if (!chat) {
              return callbackFn(callback, {
                success: false,
                message: 'Chat not found',
              });
            }

            // âœ… Filter other users in chat
            const receivers = chat.users.filter(
              (u) => u.toString() !== socket.user?._id,
            );

            // âœ… Find online users
            const receiverSocketIds = receivers
              .map((u) => connectedUsers.get(u.toString())?.socketID)
              .filter((id): id is string => Boolean(id));

            // âœ… Format time in timezone
            const time = moment()
              .tz('Asia/Dhaka')
              .format('YYYY-MM-DDTHH:mm:ss.SSS');

            // âœ… Create message first (important!)
            const newMessage = await Message.create({
              sender: socket.user?._id,
              receiver: receivers[0],
              chat: chatId,
              text,
              images,
              time,
            });

            // âœ… Outgoing payload
            const messagePayload = {
              success: true,
              chatId,
              sender: {
                _id: socket.user?._id,
                name: socket.user?.name,
                email: socket.user?.email,
                role: socket.user?.role,
              },
              text,
              images,
              time,
              messageId: newMessage._id,
              approvalStatus: newMessage.approvalStatus
            };

            // âœ… Emit to sender (local message)
            socket.emit(`message_received::${chatId}`, messagePayload);
            socket.emit('newMessage', messagePayload);
            // âœ… Emit only if receivers exist
            if (receiverSocketIds.length > 0) {

              io.to(receiverSocketIds).emit('newMessage', messagePayload);
              io.to(receiverSocketIds).emit(
                `message_received::${chatId}`,
                messagePayload,
              );
            }

            if(newMessage.approvalStatus === 'approved') {
                           // // ðŸ”” FIRE-AND-FORGET NOTIFICATIONS (NO WAIT)
                for (const receiverId of receivers) {
                  sendNotificationForNewMessage({
                    senderId: new mongoose.Types.ObjectId(socket.user?._id),
                    receiverId: new mongoose.Types.ObjectId(receiverId.toString()),
                    messageText: text || 'ðŸ“· Sent an image',
                  }).catch((err) => {
                    console.error('Notification failed:', err);
                  });
                }

              emitMessage(receivers[0].toString());
            }



            // âœ… Reply callback

            callbackFn(callback, { success: true, message: messagePayload });
          } catch (err: any) {
            console.error('Socket send-message error:', err);
            callbackFn(callback, {
              success: false,
              message: err.message || 'Failed to send message',
            });

            io.emit('io-error', {
              success: false,
              message: 'Error sending message',
            });
          }
        },
      );

      // ======= read message ====
      socket.on('readMessage', async (_, callback) => {
        try {

          console.log("readMessage event hitteeddd =>>>>>>>>>>>>>>>> ");
console.log("socket user =>>>>>>>>>>> ", socket.user);

          const userId = socket.user?._id;

          console.log({userId})
          if (!userId) {
            return callbackFn(callback, { success: false, message: 'Unauthorized' });
          }

          // Mark ALL unseen messages sent by others to this user as seen
          const updated = await Message.updateMany(
            {  receiver: new Types.ObjectId(userId), seen: false },
            { $set: { seen: true }, $addToSet: { readBy: userId } },
          );

          callbackFn(callback, {
            success: true,
            message: `${updated.modifiedCount} message(s) marked as read`,
          });
        } catch (err: any) {
          console.error('Socket readMessage error:', err);
          callbackFn(callback, {
            success: false,
            message: err.message || 'Failed to mark messages as read',
          });
        }
      });

      //----------------------chat list start------------------------//
      socket.on('my-chat-list', async ({}, callback) => {
        try {
          const chatList = await ChatService.getMyChatList(
            (socket as any).user._id,
            {},
          );

          const userSocket = connectedUsers.get((socket as any).user._id);

          if (userSocket) {
            io.to(userSocket.socketID).emit('chat-list', chatList);
            callbackFn(callback, { success: true, message: chatList });
          }

          callbackFn(callback, {
            success: false,
            message: 'not found your socket id.',
          });
        } catch (error: any) {
          callbackFn(callback, {
            success: false,
            message: error.message,
          });

          io.emit('io-error', { success: false, message: error.message });
        }
      });
      //----------------------chat list end------------------------//

      //-----------------------Disconnect functionlity start ------------------------//
      socket.on('disconnect', () => {
        console.log(
          `${socket.user?.name} || ${socket.user?.email} || ${socket.user?._id} just disconnected with socket ID: ${socket.id}`,
        );

        // Remove user from connectedUsers map
        for (const [key, value] of connectedUsers.entries()) {
          if (value.socketID === socket.id) {
            connectedUsers.delete(key);
            break;
          }
        }

        io.emit('onlineUser', Array.from(connectedUsers.keys()));
      });
      //-----------------------Disconnect functionlity end ------------------------//
    } catch (error) {
      console.error('-- socket.io connection error --', error);

      // throw new Error(error)
      //-----------------------Disconnect functionlity start ------------------------//
      socket.on('disconnect', () => {
        console.log(
          `${socket.user?.name} || ${socket.user?.email} || ${socket.user?._id} just disconnected with socket ID: ${socket.id}`,
        );

        // Remove user from connectedUsers map
        for (const [key, value] of connectedUsers.entries()) {
          if (value.socketID === socket.id) {
            connectedUsers.delete(key);
            break;
          }
        }
        // io.emit('onlineUser', Array.from(connectedUsers));
        io.emit('onlineUser', Array.from(connectedUsers.keys()));
      });
      //-----------------------Disconnect functionlity end ------------------------//
    }
    // ==================== try catch 1 end ==================== //
  });
};

// Export the Socket.IO instance
export { io };

export const emitNotification = async ({
  userId,
  receiverId,
  userMsg,
  type,
}: {
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  userMsg?: { image: string; text: string; photos?: string[] };
  type?: string;
}): Promise<void> => {
  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }

  // Get the socket ID of the specific user
  const userSocket = connectedUsers.get(receiverId.toString());

  // Fetch unread notifications count for the receiver before creating the new notification
  const unreadCount = await Notification.countDocuments({
    receiverId: receiverId,
    isRead: false, // Filter by unread notifications
  });

  // Notify the specific user
  if (userMsg && userSocket) {
    io.to(userSocket.socketID).emit(`notification`, {
      // userId,
      message: userMsg,
      statusCode: 200,
      success: true,
      unreadCount: unreadCount >= 0 ? unreadCount + 1 : 1,
      timestamp: new Date()
    });
  }

  // Save notification to the database
  const newNotification = {
    userId, // Ensure that userId is of type mongoose.Types.ObjectId
    receiverId, // Ensure that receiverId is of type mongoose.Types.ObjectId
    message: userMsg,
    type, // Use the provided type (default to "FollowRequest")
    isRead: false, // Set to false since the notification is unread initially
    timestamp: new Date(), // Timestamp of when the notification is created
  };

  // Save notification to the database
  await Notification.create(newNotification);
  
};

export const emitMessage = async(userId: string) =>{

  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }

  // Get the socket ID of the specific user
  const userSocket = connectedUsers.get(userId.toString());

  const unreadCount = await Message.countDocuments({
    receiver: new Types.ObjectId(userId),
    seen: false,
  });

  // Notify the specific user
  if ( userSocket) {
    io.to(userSocket.socketID).emit(`message_count`, {
      // userId,
      // message: userMsg,
      statusCode: 200,
      success: true,
      unreadCount: unreadCount >= 0 ? unreadCount : 1,
    });
  }
}

export const sentNotificationForBookingRequest = async ({
  userId,
  receiverId,
  orderType,
  packageName,
  serviceType,
}: {
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  orderType?: 'direct' | 'custom';
  packageName?: string;
  serviceType?: string;
}): Promise<void> => {
  // âœ… Fetch user info for notification
  const user = await User.findById(userId).select('name email profileImage');
  if (!user) throw new AppError(404, 'User not found for notification');

  // âœ… Fetch receiver info for notification
  const receiver = await User.findById(receiverId).select(
    'name email profileImage',
  );
  if (!receiver) throw new AppError(404, 'receiver not found for notification');
  // âœ… Define defaults
  const senderName = user.role === USER_ROLE.COMPANY ? user.companyName : user.name;
  const image = user.profileImage || '';
  let type: string;
  let text: string;

  // âœ… Handle notification text by order type
  switch (orderType) {
    case 'direct': {
      const safePackageName = packageName ? `"${packageName}"` : 'a package';
      type = 'DirectBookingRequest';
      text = `${senderName} has requested a direct booking from your ${safePackageName}.`;
      break;
    }

    case 'custom': {
      const readableType = serviceType?.trim() || 'service';
      type = 'CustomBookingRequest';
      text = `${senderName} has sent you a custom ${readableType} booking request from your profile.`;
      break;
    }

    default:
      throw new AppError(
        400,
        "Invalid orderType â€” must be 'direct' or 'custom'",
      );
  }

  // âœ… Build notification payload
  const notificationPayload = {
    userId: new mongoose.Types.ObjectId(userId),
    receiverId: new mongoose.Types.ObjectId(receiverId),
    userMsg: { image, text, photos: [] },
    type,
  };

  // ðŸ”” Emit socket notification (non-blocking)
  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  // âœ‰ï¸ Send email notification to receiver (service provider)
  if (receiver.email) {
    sendBookingRequestEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: senderName || '',
      orderType: orderType as 'direct' | 'custom',
      serviceType,
      packageName,
    }).catch((err) => console.error('Email notification failed:', err));
  }

};

export const sentNotificationForOrderAccepted = async ({
  orderType,
  userId, // client ID
  receiverId, // service provider ID
  serviceType,
  packageName,
}: {
  orderType: 'direct' | 'custom';
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  // Fetch client info
  const client = await User.findById(receiverId).select('companyName name email');
  if (!client) throw new AppError(404, 'Client not found for notification');

  // Fetch service provider info
  const serviceProvider = await User.findById(userId).select(
    'name profileImage email',
  );

  if (!serviceProvider)
    throw new AppError(404, 'Service provider not found for notification');

  const image = serviceProvider.profileImage || '';
  let text = '';
  let type = '';

  // Build notification text
  if (orderType === 'direct') {
    const pkgText = packageName ? `"${packageName}"` : 'your package';
    text = `${serviceProvider.name} has accepted your direct booking request for ${pkgText}. Please proceed to payment to confirm the booking.`;
    type = 'DirectBookingAccepted';
  } else {
    const readableType = serviceType || 'service';
    text = `${serviceProvider.name} has accepted your custom ${readableType} booking request. Please complete the payment to confirm your booking.`;
    type = 'CustomBookingAccepted';
  }

  const notificationPayload = {
    userId: userId, // sender = service provider
    receiverId: receiverId, // receiver = client
    userMsg: { image, text, photos: [] },
    type,
  };

  // ðŸ”” Emit socket notification (non-blocking)
  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  // âœ‰ï¸ Send email notification to client
  if (client.email) {
    sendOrderAcceptedEmail({
      sentTo: client.email,
      clientName: client.companyName ||  client.name || '',
      serviceProviderName: serviceProvider.name || '',
      orderType,
      serviceType,
      packageName,
    }).catch((err) => console.error('Email notification failed:', err));
  }


};

export const sentNotificationForPaymentSuccess = async ({
  orderType,
  userId, // client ID
  receiverId, // service provider ID
  serviceType,
  packageName,
}: {
  orderType: 'direct' | 'custom';
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  // Fetch client info
  const client = await User.findById(userId).select('name email profileImage');
  if (!client) throw new AppError(404, 'Client not found for notification');

  // Fetch service provider info
  const serviceProvider = await User.findById(receiverId).select(
    'name email profileImage',
  );
  if (!serviceProvider)
    throw new AppError(404, 'Service provider not found for notification');

  const image = client.profileImage || '';
  let text = '';
  let type = '';

  // Build notification text
  if (orderType === 'direct') {
    const pkgText = packageName ? `"${packageName}"` : 'your package';
    text = `${client.name} has successfully completed payment for ${pkgText}. The order is now in progress.`;
    type = 'DirectBookingInProgress';
  } else {
    const readableType = serviceType || 'service';
    text = `${client.name} has completed payment for your custom ${readableType} booking. The order is now in progress.`;
    type = 'CustomBookingInProgress';
  }

  const notificationPayload = {
    userId, // sender = client
    receiverId, // receiver = service provider
    userMsg: { image, text, photos: [] },
    type,
  };

  // ðŸ”” Emit socket notification (non-blocking)
  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  // âœ‰ï¸ Send email notification to service provider
  if (serviceProvider.email) {
    sendPaymentSuccessEmail({
      sentTo: serviceProvider.email,
      receiverName: serviceProvider.name || '',
      clientName: client.name || '',
      orderType,
      serviceType,
      packageName,
    }).catch((err) => console.error('Email notification failed:', err));
  }

};

export const sentNotificationForDeliveryRequest = async ({
  orderType,
  userId, // sender = service provider
  receiverId, // receiver = client
  serviceType,
  packageName,
}: {
  orderType: 'direct' | 'custom';
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  const sender = await User.findById(userId).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  console.log("receiver email =>>> ", receiver)

  if (!sender || !receiver)
    throw new AppError(404, 'User not found for notification');

  const text =
    orderType === 'direct'
      ? `${sender.name} has submitted the delivery for your ${serviceType || 'order'}. Please review and confirm.`
      : `${sender.name} has sent a delivery request for your custom ${serviceType || 'booking'}. Please review.`;

  const notificationPayload = {
    userId, // sender = service provider
    receiverId, // receiver = client
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: 'DeliveryRequest',
  };

  // ðŸ”” Emit socket notification
  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  // âœ‰ï¸ Send email
  if (receiver.email) {
    sendDeliveryRequestEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      orderType,
      serviceType,
      packageName,
    }).catch((err) => console.error('Email notification failed:', err));
  }

};

export const sentNotificationForDeliveryAccepted = async ({
  orderType,
  userId, // sender = client
  receiverId, // receiver = service provider
  serviceType,
  packageName,
}: {
  orderType: 'direct' | 'custom';
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  // ðŸ”¹ Fetch sender (client) and receiver (service provider)
  const sender = await User.findById(userId).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver)
    throw new AppError(404, 'User not found for notification');

  // ðŸ”¹ Build notification message
  const text =
    orderType === 'direct'
      ? `${sender.name} has accepted your delivery request for ${serviceType || 'order'}${packageName ? ` (${packageName})` : ''}. Great job!`
      : `${sender.name} has accepted your delivery request for the custom ${serviceType || 'booking'}. Congratulations!`;

  const notificationPayload = {
    userId, // sender = client
    receiverId, // receiver = service provider
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: 'DeliveryAccepted',
  };

  // ðŸ”” Emit real-time notification
  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  // âœ‰ï¸ Send email notification
  if (receiver.email) {
    sendDeliveryAcceptedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      clientName: sender.name || '',
      serviceType,
      packageName,
    }).catch((err) => console.error('Email notification failed:', err));
  }

};

export const sentNotificationForReviewRequest = async ({
  customerId,
  serviceProviderId,
  serviceType,
  packageName,
}: {
  customerId: mongoose.Types.ObjectId;
  serviceProviderId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  const serviceProvider = await User.findById(serviceProviderId).select('name profileImage');
  const customer = await User.findById(customerId).select('name email emailNotificationsEnabled');

  if (!serviceProvider || !customer) return;

  const text = `Your order with ${serviceProvider.name} has been delivered. Please leave a review to share your experience.`;

  const notificationPayload = {
    userId: serviceProviderId, // actor = service provider whose order was delivered
    receiverId: customerId, // receiver = customer who should leave the review
    userMsg: { image: serviceProvider.profileImage || '', text, photos: [] },
    type: 'ReviewRequest',
  };

  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  if (customer.email && customer.emailNotificationsEnabled !== false) {
    sendReviewRequestEmail({
      sentTo: customer.email,
      receiverName: customer.name || '',
      serviceProviderName: serviceProvider.name || '',
      serviceType,
      packageName,
    }).catch((err) => console.error('Email notification failed:', err));
  }
};

export const sentNotificationForOrderDeclined = async ({
  orderType,
  userId, // sender = client
  receiverId, // receiver = service provider
  serviceType,
  packageName,
  status = 'declined',
  reason,
}: {
  orderType: 'direct' | 'custom';
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
  status?: 'declined' | 'deliveryRequestDeclined';
  reason?: string;
}) => {

  const sender = await User.findById(userId).select('name email profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver)
    throw new AppError(404, 'User not found for notification');

  const text =
    status === 'deliveryRequestDeclined'
      ? `${sender.name} has declined the delivery request for your ${orderType === 'direct' ? packageName || serviceType || 'order' : `custom ${serviceType || 'booking'}`}.`
      : orderType === 'direct'
        ? `${sender.name} has declined your direct order request${serviceType ? ` for ${serviceType}` : ''}.`
        : `${sender.name} has declined your custom ${serviceType || 'booking'} request.`;

  const notificationPayload = {
    userId,
    receiverId,
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: status === 'deliveryRequestDeclined' ? 'DeliveryRequestDeclined' : 'OrderDeclined',
  };

  // Emit socket notification
  emitNotification(notificationPayload).catch((err) =>
    console.error('Socket notification failed:', err),
  );

  // Send email
  if (receiver.email) {
    sendOrderDeclinedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      orderType,
      serviceType,
      packageName,
      status,
      reason,
    }).catch((err) => console.error('Email notification failed:', err));
  }

};

export const sentNotificationForOrderCancelled = async ({
  orderType,
  cancelledBy,
  receiverId,
  serviceType,
  packageName,
}: {
  orderType: 'direct' | 'custom';
  cancelledBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  const sender = await User.findById(cancelledBy).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver) return;

  const text =
    orderType === 'direct'
      ? `${sender.name} has cancelled the ${packageName || serviceType || 'order'}.`
      : `${sender.name} has cancelled your custom ${serviceType || 'booking'}.`;

  const payload = {
    userId: cancelledBy,
    receiverId,
    userMsg: {
      image: sender.profileImage || '',
      text,
      photos: [],
    },
    type: 'OrderCancelled',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendOrderCancelledEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      orderType,
      serviceType,
      packageName,
    }).catch((err) => console.error('Email failed:', err));
  }

};


export const sentNotificationForCancelRequest = async ({
  orderType,
  requestedBy,
  receiverId,
  serviceType,
  reason,
}: {
  orderType: 'direct' | 'custom';
  requestedBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  reason?: string;
}) => {
  const sender = await User.findById(requestedBy).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver) return;

  const text =
    orderType === 'direct'
      ? `${sender.name} has requested to cancel the ${serviceType || 'order'}${reason ? `: "${reason}"` : '.'}`
      : `${sender.name} has requested to cancel your custom ${serviceType || 'booking'}${reason ? `: "${reason}"` : '.'}`;

  const payload = {
    userId: requestedBy,
    receiverId,
    userMsg: {
      image: sender.profileImage || '',
      text,
      photos: [],
    },
    type: 'CancelRequest',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendCancelRequestEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      requesterName: sender.name || '',
      serviceType,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForProfileDeclined = async ({
  receiverId,
  reason,
  user
}: {
  receiverId: mongoose.Types.ObjectId;
  reason: string;
  user: any;
}) => {


  if (!user) return;

  const text = `Your professional profile verification has been declined. Reason: "${reason}"`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: {
      image: '',
      text,
      photos: [],
    },
    type: 'ProfileDeclined',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (user.email) {
    await profileDeclinedEmail({
      sentTo: user.email,
      name: user.name || '',
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForCommunityRejected = async ({
  receiverId,
  communityTitle,
  reason,
}: {
  receiverId: mongoose.Types.ObjectId;
  communityTitle: string;
  reason: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');

  if (!receiver) return;

  const text = `Your community post "${communityTitle}" has been rejected by the admin. Reason: "${reason}"`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: {
      image: '',
      text,
      photos: [],
    },
    type: 'CommunityRejected',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: 'Your Community Post Has Been Rejected',
      userName: receiver.name || '',
      messageText: text,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForCommunityDeleted = async ({
  receiverId,
  communityTitle,
  reason,
}: {
  receiverId: mongoose.Types.ObjectId;
  communityTitle: string;
  reason: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');

  if (!receiver) return;

  const text = `Your community post "${communityTitle}" has been removed by the system admin. Reason: "${reason}"`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: {
      image: '',
      text,
      photos: [],
    },
    type: 'CommunityDeleted',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: 'Your Community Post Has Been Removed',
      userName: receiver.name || '',
      messageText: text,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForCommentOrReply = async ({
  actorId,
  receiverId,
  communityTitle,
  isReply,
  commentText,
}: {
  actorId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  communityTitle: string;
  isReply: boolean;
  commentText: string;
}) => {

  console.log("sent notification =>>>> ", {
  actorId,
  receiverId,
  communityTitle,
  isReply,
  commentText,
})
  if (actorId.toString() === receiverId.toString()) return;

  const actor = await User.findById(actorId).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email emailNotificationsEnabled');

  if (!actor || !receiver) return;

  const text = isReply
    ? `${actor.name} replied to a comment on your post "${communityTitle}": "${commentText}"`
    : `${actor.name} commented on your post "${communityTitle}": "${commentText}"`;

  const payload = {
    userId: actorId,
    receiverId,
    userMsg: {
      image: actor.profileImage || '',
      text,
      photos: [],
    },
    type: isReply ? 'CommentReply' : 'NewComment',
  };

  console.log({
  actorId,
  receiverId,
  communityTitle,
  isReply,
  commentText,
})
  console.log("payload of sent notificatio=>>> ", payload)

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email && receiver.emailNotificationsEnabled !== false) {
    sendCommentOrReplyEmail({
      sentTo: receiver.email,
      receiverId: receiver._id.toString(),
      receiverName: receiver.name || '',
      actorName: actor.name || '',
      communityTitle,
      commentText,
      isReply,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForCancelRequestDeclined = async ({
  declinedBy,
  receiverId,
  serviceType,
  reason,
}: {
  declinedBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  reason?: string;
}) => {
  const sender = await User.findById(declinedBy).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver) return;

  const text = `${sender.name} has declined your cancellation request for the ${serviceType || 'order'}${reason ? `. Reason: "${reason}"` : '.'}`;

  const payload = {
    userId: declinedBy,
    receiverId,
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: 'CancelRequestDeclined',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendCancelRequestDeclinedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      declinedByName: sender.name || '',
      serviceType,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForExtensionRequest = async ({
  requestedBy,
  receiverId,
  serviceType,
  reason,
}: {
  requestedBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  reason?: string;
}) => {
  const sender = await User.findById(requestedBy).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver) return;

  const text = `${sender.name} has requested a delivery date extension for the ${serviceType || 'order'}${reason ? `: "${reason}"` : '.'}`;

  const payload = {
    userId: requestedBy,
    receiverId,
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: 'ExtensionRequest',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendExtensionRequestEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      serviceType,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForExtensionAccepted = async ({
  acceptedBy,
  receiverId,
  serviceType,
  newDeliveryDate,
}: {
  acceptedBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  newDeliveryDate?: Date;
}) => {
  const sender = await User.findById(acceptedBy).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver) return;

  const dateStr = newDeliveryDate
    ? new Date(newDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'the new date';

  const text = `${sender.name} has accepted your delivery date extension request for the ${serviceType || 'order'}. New delivery date: ${dateStr}.`;

  const payload = {
    userId: acceptedBy,
    receiverId,
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: 'ExtensionAccepted',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendExtensionAcceptedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      serviceType,
      newDeliveryDate,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForExtensionRejected = async ({
  rejectedBy,
  receiverId,
  serviceType,
  reason,
}: {
  rejectedBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  reason?: string;
}) => {
  const sender = await User.findById(rejectedBy).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email');

  if (!sender || !receiver) return;

  const text = `${sender.name} has rejected your delivery date extension request for the ${serviceType || 'order'}${reason ? `. Reason: "${reason}"` : '.'}`;

  const payload = {
    userId: rejectedBy,
    receiverId,
    userMsg: { image: sender.profileImage || '', text, photos: [] },
    type: 'ExtensionRejected',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendExtensionRejectedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      serviceType,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForGearMarketplaceApproved = async ({
  receiverId,
  itemName,
}: {
  receiverId: mongoose.Types.ObjectId;
  itemName: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');
  if (!receiver) return;

  const text = `Congratulations! Your gear item "${itemName}" has been approved by the admin and is now live on the marketplace.`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: { image: '', text, photos: [] },
    type: 'GearMarketplaceApproved',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (receiver.email) {
    sendGearMarketplaceApprovedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      itemName,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearMarketplaceDeclined = async ({
  receiverId,
  itemName,
  reason,
}: {
  receiverId: mongoose.Types.ObjectId;
  itemName: string;
  reason?: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');
  if (!receiver) return;

  const text = `Your gear item "${itemName}" has been declined by the admin${reason ? `. Reason: "${reason}"` : '.'}`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: { image: '', text, photos: [] },
    type: 'GearMarketplaceDeclined',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (receiver.email) {
    sendGearMarketplaceDeclinedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      itemName,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearPaymentReceived = async ({
  sellerId,
  clientId,
  itemName,
}: {
  sellerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  itemName?: string;
}) => {
  const seller = await User.findById(sellerId).select('name email');
  const client = await User.findById(clientId).select('name');

  if (!seller || !client) return;

  const text = `Payment from ${client.name} has been received for your gear order${itemName ? ` "${itemName}"` : ''}. The order is now in progress.`;

  const payload = {
    userId: clientId,
    receiverId: sellerId,
    userMsg: { image: '', text, photos: [] },
    type: 'GearPaymentReceived',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (seller.email) {
    sendGearPaymentReceivedEmail({
      sentTo: seller.email,
      receiverName: seller.name || '',
      clientName: client.name || '',
      itemName,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearDeliveryRequest = async ({
  sellerId,
  clientId,
  itemName,
}: {
  sellerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  itemName?: string;
}) => {
  const seller = await User.findById(sellerId).select('name profileImage');
  const client = await User.findById(clientId).select('name email');

  if (!seller || !client) return;

  const text = `${seller.name} has marked your gear order${itemName ? ` "${itemName}"` : ''} as delivered. Please confirm receipt.`;

  const payload = {
    userId: sellerId,
    receiverId: clientId,
    userMsg: { image: seller.profileImage || '', text, photos: [] },
    type: 'GearDeliveryRequest',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (client.email) {
    sendGearDeliveryRequestEmail({
      sentTo: client.email,
      receiverName: client.name || '',
      senderName: seller.name || '',
      itemName,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearDeliveryAccepted = async ({
  sellerId,
  clientId,
  itemName,
}: {
  sellerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  itemName?: string;
}) => {
  const seller = await User.findById(sellerId).select('name email');
  const client = await User.findById(clientId).select('name profileImage');

  if (!seller || !client) return;

  const text = `${client.name} has confirmed receipt of the gear order${itemName ? ` "${itemName}"` : ''}.`;

  const payload = {
    userId: clientId,
    receiverId: sellerId,
    userMsg: { image: client.profileImage || '', text, photos: [] },
    type: 'GearDeliveryAccepted',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (seller.email) {
    sendGearDeliveryAcceptedEmail({
      sentTo: seller.email,
      receiverName: seller.name || '',
      clientName: client.name || '',
      itemName,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearDeliveryDeclined = async ({
  sellerId,
  clientId,
  itemName,
  reason,
}: {
  sellerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  itemName?: string;
  reason?: string;
}) => {
  const seller = await User.findById(sellerId).select('name email');
  const client = await User.findById(clientId).select('name profileImage');

  if (!seller || !client) return;

  const text = `${client.name} has declined the delivery for the gear order${itemName ? ` "${itemName}"` : ''}${reason ? `. Reason: "${reason}"` : '.'}`;

  const payload = {
    userId: clientId,
    receiverId: sellerId,
    userMsg: { image: client.profileImage || '', text, photos: [] },
    type: 'GearDeliveryDeclined',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (seller.email) {
    sendGearDeliveryDeclinedEmail({
      sentTo: seller.email,
      receiverName: seller.name || '',
      clientName: client.name || '',
      itemName,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearOrderCancelled = async ({
  cancelledBy,
  clientId,
  itemName,
  reason,
}: {
  cancelledBy: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  itemName?: string;
  reason?: string;
}) => {
  const canceller = await User.findById(cancelledBy).select('name profileImage');
  const client = await User.findById(clientId).select('name email');

  if (!canceller || !client) return;

  const text = `${canceller.name} has cancelled your gear order${itemName ? ` "${itemName}"` : ''}${reason ? `. Reason: "${reason}"` : '.'}`;

  const payload = {
    userId: cancelledBy,
    receiverId: clientId,
    userMsg: { image: canceller.profileImage || '', text, photos: [] },
    type: 'GearOrderCancelled',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (client.email) {
    sendGearOrderCancelledEmail({
      sentTo: client.email,
      receiverName: client.name || '',
      cancelledByName: canceller.name || '',
      itemName,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForGearOrderSold = async ({
  sellerId,
  clientId,
  items,
}: {
  sellerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  items: { orderId: string; itemName: string; price: number }[];
}) => {
  const seller = await User.findById(sellerId).select('name email');
  const client = await User.findById(clientId).select('name profileImage');

  if (!seller || !client || !items.length) return;

  const itemNames = items.map((i) => i.itemName).join(', ');
  const text = items.length > 1
    ? `${client.name} purchased ${items.length} of your gear items: ${itemNames}.`
    : `${client.name} purchased your gear item "${itemNames}".`;

  const payload = {
    userId: clientId,
    receiverId: sellerId,
    userMsg: { image: client.profileImage || '', text, photos: [] },
    type: 'GearOrderSold',
  };

  await emitNotification(payload).catch((err) => console.error('Socket error:', err));

  if (seller.email) {
    sendGearOrderSoldEmail({
      sentTo: seller.email,
      receiverName: seller.name || '',
      clientName: client.name || '',
      items,
    }).catch((err) => console.error('Email failed:', err));
  }
};

export const sentNotificationForWorkshopApproved = async ({
  receiverId,
  workshopTitle,
}: {
  receiverId: mongoose.Types.ObjectId;
  workshopTitle: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');

  if (!receiver) return;

  const text = `Congratulations! Your workshop "${workshopTitle}" has been approved by the admin and is now live.`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: { image: '', text, photos: [] },
    type: 'WorkshopApproved',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendWorkshopApprovedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      workshopTitle,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForWorkshopDeclined = async ({
  receiverId,
  workshopTitle,
  reason,
}: {
  receiverId: mongoose.Types.ObjectId;
  workshopTitle: string;
  reason: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');

  if (!receiver) return;

  const text = `Your workshop "${workshopTitle}" has been declined by the admin. Reason: "${reason}"`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: { image: '', text, photos: [] },
    type: 'WorkshopDeclined',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendWorkshopDeclinedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      workshopTitle,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForPackageApproved = async ({
  receiverId,
  packageTitle,
}: {
  receiverId: mongoose.Types.ObjectId;
  packageTitle: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');

  if (!receiver) return;

  const text = `Congratulations! Your package "${packageTitle}" has been approved by the admin and is now live.`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: {
      image: '',
      text,
      photos: [],
    },
    type: 'PackageApproved',
  };

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendPackageApprovedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      packageTitle,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForPackageDeclined = async ({
  receiverId,
  packageTitle,
  reason,
}: {
  receiverId: mongoose.Types.ObjectId;
  packageTitle: string;
  reason: string;
}) => {
  const receiver = await User.findById(receiverId).select('name email');

  if (!receiver) return;

  const text = `Your package "${packageTitle}" has been declined by the admin. Reason: "${reason}"`;

  const payload = {
    userId: receiverId,
    receiverId,
    userMsg: {
      image: '',
      text,
      photos: [],
    },
    type: 'PackageDeclined',
  };

  console.log("payload =>>> ", payload);

  await emitNotification(payload).catch((err) =>
    console.error('Socket error:', err),
  );

  if (receiver.email) {
    sendPackageDeclinedEmail({
      sentTo: receiver.email,
      receiverName: receiver.name || '',
      packageTitle,
      reason,
    }).catch((err) => console.error('Email failed:', err));
  }
};


export const sentNotificationForRefundRequired = async ({
  cancelledBy,
  customerId,
  orderId,
  serviceType,
  paidAmount,
}: {
  cancelledBy: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  serviceType?: string;
  paidAmount?: number;
}) => {
  const canceller = await User.findById(cancelledBy).select('name role companyName profileImage');
  const customer = await User.findById(customerId).select('email');
  const admins = await User.find({ role: {
    $in: [USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN],
  }, isDeleted: false }).select('_id name email');

  if (!canceller || !admins.length) return;

  const amountText = paidAmount !== undefined ? ` Paid amount: ${paidAmount.toFixed(2)} EUR.` : '';
  const customerEmailText = customer?.email ? ` Customer: ${customer.email}.` : '';
  const text = `Order #${orderId} for ${serviceType || 'a service'} has been cancelled by ${canceller.name}. A refund may be required.${customerEmailText}${amountText}`;

  await Promise.all(
    admins.map(async (admin) => {
      const payload = {
        userId: cancelledBy,
        receiverId: admin._id as any,
        userMsg: {
          image: canceller.profileImage || '',
          text,
          photos: [],
        },
        type: 'RefundRequired',
      };

      await emitNotification(payload).catch((err) =>
        console.error('Socket error:', err),
      );

      if (admin.email) {
        sendRefundRequiredEmail({
          sentTo: admin.email,
          adminName: admin.name || '',
          cancellerName: canceller.name || '',
          orderId: orderId.toString(),
          serviceType,
          customerEmail: customer?.email,
          paidAmount,
        }).catch((err) => console.error('Email failed:', err));
      }
    }),
  );
};


export const sendNotificationForNewMessage = async ({
  senderId,
  receiverId,
  messageText,
}: {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  messageText: string;
}) => {
  // ðŸ”¹ Fetch sender & receiver
  const sender = await User.findById(senderId).select('name profileImage');
  const receiver = await User.findById(receiverId).select('name email emailNotificationsEnabled');

  if (!sender || !receiver) {
    throw new AppError(404, 'User not found for message notification');
  }

  // ðŸ”” Emit unread message count to receiver via socket
  emitMessage(receiverId.toString()).catch((err) =>
    console.error('Message count socket emit failed:', err),
  );

  // âœ‰ï¸ Send email
  if (receiver.email && receiver.emailNotificationsEnabled !== false) {
    sendNewMessageEmail({
      sentTo: receiver.email,
      receiverId: receiver._id.toString(),
      receiverName: receiver.name || '',
      senderName: sender.name || '',
      messageText,
    }).catch((err) =>
      console.error('Email notification failed:', err),
    );
  }

};
