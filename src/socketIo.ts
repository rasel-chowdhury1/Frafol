import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import express, { Application } from "express";
import httpStatus from "http-status";
import AppError from "./app/error/AppError";
import { verifyToken } from "./app/utils/tokenManage";
import config from "./app/config";
import { User } from "./app/modules/user/user.models";
import mongoose from "mongoose";
import Notification from "./app/modules/notifications/notifications.model";
import colors from 'colors';
import { callbackFn } from "./app/utils/callbackFn";
import { sendBookingNotificationEmail } from "./app/utils/eamilNotifiacation";
import Chat from "./app/modules/chat/chat.model";
import moment from "moment-timezone";
import Message from "./app/modules/message/message.model";
import { ChatService } from "./app/modules/chat/chat.service";
import { text } from "stream/consumers";

// Define the socket server port
const socketPort: number = parseInt(process.env.SOCKET_PORT || "9020", 10);

const app: Application = express();

declare module "socket.io" {
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

  const { Server } = await import("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*", // Replace with your client's origin
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"], // Add any custom headers if needed
      credentials: true,
    },
  });

   // Start the HTTP server on the specified port
  server.listen(socketPort, () => {
    console.log(
      //@ts-ignore
      `---> Socket server is listening on : http://${config.ip}:${config.socket_port}`.yellow
        .bold,
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
          "Authentication error: Token missing",
        ),
      );
    }

    // const userDetails = verifyToken({token, access_secret: config.jwt_access_secret as string});

    let userDetails;
    try {
      userDetails = verifyToken({
        token, 
        access_secret: config.jwt_access_secret as string
      });
    } catch (err) {
      console.error("Socket JWT verify error:", err);
      return next(new Error("Authentication error: Invalid token"));
    }



    if (!userDetails) {
      return next(new Error("Authentication error: Invalid token"));
    }

    const user = await User.findById(userDetails.userId);
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.user = {
        _id: user._id.toString(), // Convert _id to string if necessary
        name: user.name as string,
        email: user.email,
        role: user.role,
      };;
    next();
  });


   io.on("connection", (socket: Socket) => {
    
    // =================== try catch 1 start ================
    try {
          // Automatically register the connected user to avoid missing the "userConnected" event.
    if (socket.user && socket.user._id) {
      connectedUsers.set(socket.user._id.toString(), { socketID: socket.id });
      console.log(
        `Registered user ${socket.user._id.toString()} with socket ID: ${socket.id}`,
      );
    }

    // (Optional) In addition to auto-registering, you can still listen for a "userConnected" event if needed.
    socket.on("userConnected", ({ userId }: { userId: string }) => {
      connectedUsers.set(userId, { socketID: socket.id });
      console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    });

      //----------------------online array send for front end------------------------//
      io.emit('onlineUser', Array.from(connectedUsers));

      // ===================== join by user id ================================
      // socket.join(user?._id?.toString());

      // ======= message send ====
      socket.on(
        "send-message",
        async (
          payload: { text: string; images: string[]; chatId: string },
          callback
        ) => {
          try {
            const { chatId, text, images } = payload;
            if (!chatId) {
              return callbackFn(callback, {
                success: false,
                message: "chatId is required",
              });
            }

            // ✅ Validate chat exists
            const chat = await Chat.findById(chatId).select("users");
            if (!chat) {
              return callbackFn(callback, {
                success: false,
                message: "Chat not found",
              });
            }

            // ✅ Filter other users in chat
            const receivers = chat.users.filter(
              (u) => u.toString() !== socket.user?._id
            );

            // ✅ Find online users
            const receiverSocketIds = receivers
              .map((u) => connectedUsers.get(u.toString())?.socketID)
              .filter((id): id is string => Boolean(id));

            // ✅ Format time in timezone
            const time = moment()
              .tz("Asia/Dhaka")
              .format("YYYY-MM-DDTHH:mm:ss.SSS");

            // ✅ Create message first (important!)
            const newMessage = await Message.create({
              sender: socket.user?._id,
              chat: chatId,
              text,
              images,
              time,
            });

            // ✅ Outgoing payload
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
            };

            // ✅ Emit to sender (local message)
            socket.emit(`message_received::${chatId}`, messagePayload);

            // ✅ Emit only if receivers exist
            if (receiverSocketIds.length > 0) {
              io.to(receiverSocketIds).emit("newMessage", messagePayload);
              io.to(receiverSocketIds).emit(
                `message_received::${chatId}`,
                messagePayload
              );
            }

            // ✅ Reply callback
            callbackFn(callback, { success: true, message: messagePayload });
          } catch (err: any) {
            console.error("Socket send-message error:", err);
            callbackFn(callback, {
              success: false,
              message: err.message || "Failed to send message",
            });

            io.emit("io-error", {
              success: false,
              message: "Error sending message",
            });
          }
        }
      );

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
      socket.on("disconnect", () => {
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

        console.log('connectedUsers', Array.from(connectedUsers));
        io.emit('onlineUser', Array.from(connectedUsers));


      });
      //-----------------------Disconnect functionlity end ------------------------//
      
    } catch (error) {

      console.error('-- socket.io connection error --', error);

      // throw new Error(error)
      //-----------------------Disconnect functionlity start ------------------------//
      socket.on("disconnect", () => {
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
        io.emit('onlineUser', Array.from(connectedUsers));
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
  type
}: {
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  userMsg?: {image: string, text: string, photos?: string[]};
  type?: string;
}): Promise<void> => {

  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  // Get the socket ID of the specific user
  const userSocket = connectedUsers.get(receiverId.toString());

  // Fetch unread notifications count for the receiver before creating the new notification
  const unreadCount = await Notification.countDocuments({
    receiverId: receiverId,
    isRead: false,  // Filter by unread notifications
  });

  // Notify the specific user
  if (userMsg && userSocket) {

    io.to(userSocket.socketID).emit(`notification`, {
      // userId,
      // message: userMsg,
      statusCode: 200,
      success: true,
      unreadCount: unreadCount >= 0 ? unreadCount + 1 : 1,
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




export const sentNotificationForBookingRequest = async ({
  userId,
  receiverId,
  orderType,
  packageName,
  serviceType,
}: {
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  orderType?: "direct" | "custom";
  packageName?: string;
  serviceType?: string;
}): Promise<void> => {
  
  // ✅ Fetch user info for notification
  const user = await User.findById(userId).select("name email profileImage");
  if (!user) throw new AppError(404, "User not found for notification");

  // ✅ Fetch receiver info for notification
  const receiver = await User.findById(receiverId).select("name email profileImage");
  if (!receiver) throw new AppError(404, "receiver not found for notification");
  // ✅ Define defaults
  const senderName = user.name || "A user";
  const image = user.profileImage || "";
  let type: string;
  let text: string;
  let emailSubject: string;

  // ✅ Handle notification text by order type
  switch (orderType) {
    case "direct": {
      const safePackageName = packageName ? `"${packageName}"` : "a package";
      type = "DirectBookingRequest";
      text = `${senderName} has requested a direct booking from your ${safePackageName}.`;
      emailSubject = `New Direct Booking Request from ${senderName}`;
      break;
    }

    case "custom": {
      const readableType = serviceType?.trim() || "service";
      type = "CustomBookingRequest";
      text = `${senderName} has sent you a custom ${readableType} booking request from your profile.`;
      emailSubject = `New Custom ${readableType} Booking Request from ${senderName}`;
      break;
    }

    default:
      throw new AppError(400, "Invalid orderType — must be 'direct' or 'custom'");
  }

  // ✅ Build notification payload
  const notificationPayload = {
    userId: new mongoose.Types.ObjectId(userId),
    receiverId: new mongoose.Types.ObjectId(receiverId),
    userMsg: { image, text, photos: [] },
    type,
  };

    // 🔔 Emit socket notification (non-blocking)
  emitNotification(notificationPayload).catch(err =>
    console.error("Socket notification failed:", err)
  );

  // ✉️ Send email notification to client
  if (receiver.email) {
    sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: emailSubject,
      userName: receiver.name || "", // show service provider name
      messageText: text,
    }).catch(err => console.error("Email notification failed:", err));
  }


  console.log("📩 Booking notification sent:", {
    receiver: receiverId.toString(),
    type,
    text,
  });
};


export const sentNotificationForOrderAccepted = async ({
  orderType,
  userId,       // client ID
  receiverId,   // service provider ID
  serviceType,
  packageName,
}: {
  orderType: "direct" | "custom";
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {

  // Fetch client info
  const client = await User.findById(receiverId).select("name email");
  if (!client) throw new AppError(404, "Client not found for notification");

  // Fetch service provider info
  const serviceProvider = await User.findById(userId).select("name profileImage email");

  if (!serviceProvider) throw new AppError(404, "Service provider not found for notification");


  const image = serviceProvider.profileImage || "";
  let text = "";
  let type = "";

  // Build notification text
  if (orderType === "direct") {
    const pkgText = packageName ? `"${packageName}"` : "your package";
    text = `${serviceProvider.name} has accepted your direct booking request for ${pkgText}. Please proceed to payment to confirm the booking.`;
    type = "DirectBookingAccepted";
  } else {
    const readableType = serviceType || "service";
    text = `${serviceProvider.name} has accepted your custom ${readableType} booking request. Please complete the payment to confirm your booking.`;
    type = "CustomBookingAccepted";
  }

  const notificationPayload = {
    userId: userId, // sender = service provider
    receiverId: receiverId, // receiver = client
    userMsg: { image, text, photos: [] },
    type,
  };

  // 🔔 Emit socket notification (non-blocking)
  emitNotification(notificationPayload).catch(err =>
    console.error("Socket notification failed:", err)
  );

  // ✉️ Send email notification to client
  if (serviceProvider.email) {
    sendBookingNotificationEmail({
      sentTo: serviceProvider.email,
      subject: "Booking Accepted Notification",
      userName: serviceProvider.name || "", // show service provider name
      messageText: text,
    }).catch(err => console.error("Email notification failed:", err));
  }

  console.log("📩 Sent order accept notification with payment info:", notificationPayload);
};

export const sentNotificationForPaymentSuccess = async ({
  orderType,
  userId,       // client ID
  receiverId,   // service provider ID
  serviceType,
  packageName,
}: {
  orderType: "direct" | "custom";
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {

  // Fetch client info
  const client = await User.findById(userId).select("name email profileImage");
  if (!client) throw new AppError(404, "Client not found for notification");

  // Fetch service provider info
  const serviceProvider = await User.findById(receiverId).select("name email profileImage");
  if (!serviceProvider) throw new AppError(404, "Service provider not found for notification");

  const image = client.profileImage || "";
  let text = "";
  let type = "";

  // Build notification text
  if (orderType === "direct") {
    const pkgText = packageName ? `"${packageName}"` : "your package";
    text = `${client.name} has successfully completed payment for ${pkgText}. The order is now in progress.`;
    type = "DirectBookingInProgress";
  } else {
    const readableType = serviceType || "service";
    text = `${client.name} has completed payment for your custom ${readableType} booking. The order is now in progress.`;
    type = "CustomBookingInProgress";
  }

  const notificationPayload = {
    userId, // sender = client
    receiverId, // receiver = service provider
    userMsg: { image, text, photos: [] },
    type,
  };

  // 🔔 Emit socket notification (non-blocking)
  emitNotification(notificationPayload).catch(err =>
    console.error("Socket notification failed:", err)
  );

  // ✉️ Send email notification to service provider
  if (serviceProvider.email) {
    sendBookingNotificationEmail({
      sentTo: serviceProvider.email,
      subject: "Payment Successful - Order In Progress",
      userName: serviceProvider.name || "",
      messageText: text,
    }).catch(err => console.error("Email notification failed:", err));
  }

  console.log("📩 Sent payment success / order in progress notification:", notificationPayload);
};


 export const sentNotificationForDeliveryRequest = async ({
  orderType,
  userId, // sender = service provider
  receiverId, // receiver = client
  serviceType,
  packageName
}: {
  orderType: "direct" | "custom";
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  const sender = await User.findById(userId).select("name profileImage");
  const receiver = await User.findById(receiverId).select("name email");

  if (!sender || !receiver) throw new AppError(404, "User not found for notification");

  const text =
    orderType === "direct"
      ? `${sender.name} has submitted the delivery for your ${serviceType || "order"}. Please review and confirm.`
      : `${sender.name} has sent a delivery request for your custom ${serviceType || "booking"}. Please review.`;

  const notificationPayload = {
    userId, // sender = service provider
    receiverId, // receiver = client
    userMsg: { image: sender.profileImage || "", text, photos: [] },
    type: "DeliveryRequest",
  };

  // 🔔 Emit socket notification
  emitNotification(notificationPayload).catch((err) =>
    console.error("Socket notification failed:", err)
  );

  // ✉️ Send email
  if (receiver.email) {
    sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: "Delivery Request Received",
      userName: receiver.name || "",
      messageText: text,
    }).catch((err) => console.error("Email notification failed:", err));
  }

  console.log("📩 Sent delivery request notification:", notificationPayload);
};

export const sentNotificationForDeliveryAccepted = async ({
  orderType,
  userId, // sender = client
  receiverId, // receiver = service provider
  serviceType,
  packageName,
}: {
  orderType: "direct" | "custom";
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  // 🔹 Fetch sender (client) and receiver (service provider)
  const sender = await User.findById(userId).select("name profileImage");
  const receiver = await User.findById(receiverId).select("name email");

  if (!sender || !receiver) throw new AppError(404, "User not found for notification");

  // 🔹 Build notification message
  const text =
    orderType === "direct"
      ? `${sender.name} has accepted your delivery request for ${serviceType || "order"}${packageName ? ` (${packageName})` : ""}. Great job!`
      : `${sender.name} has accepted your delivery request for the custom ${serviceType || "booking"}. Congratulations!`;

  const notificationPayload = {
    userId, // sender = client
    receiverId, // receiver = service provider
    userMsg: { image: sender.profileImage || "", text, photos: [] },
    type: "DeliveryAccepted",
  };

  // 🔔 Emit real-time notification
  emitNotification(notificationPayload).catch((err) =>
    console.error("Socket notification failed:", err)
  );

  // ✉️ Send email notification
  if (receiver.email) {
    sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: "Delivery Request Accepted ✅",
      userName: receiver.name || "",
      messageText: text,
    }).catch((err) => console.error("Email notification failed:", err));
  }

  console.log("📩 Sent delivery accepted notification:", notificationPayload);
};


export const sentNotificationForOrderDeclined = async ({
  orderType,
  userId,       // sender = client
  receiverId,   // receiver = service provider
  serviceType,
  packageName
}: {
  orderType: "direct" | "custom";
  userId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  const sender = await User.findById(userId).select("name profileImage");
  const receiver = await User.findById(receiverId).select("name email");

  if (!sender || !receiver) throw new AppError(404, "User not found for notification");

  const text =
    orderType === "direct"
      ? `${sender.name} has declined your direct order request${serviceType ? ` for ${serviceType}` : ""}.`
      : `${sender.name} has declined your custom ${serviceType || "booking"} request.`;

  const notificationPayload = {
    userId,
    receiverId,
    userMsg: { image: sender.profileImage || "", text, photos: [] },
    type: "OrderDeclined",
  };

  // 🔔 Emit socket notification
  emitNotification(notificationPayload).catch(err =>
    console.error("Socket notification failed:", err)
  );

  // ✉️ Send email
  if (receiver.email) {
    sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: "Order Request Declined",
      userName: receiver.name || "",
      messageText: text,
    }).catch(err => console.error("Email notification failed:", err));
  }

  console.log("📩 Sent order declined notification:", notificationPayload);
};



export const sentNotificationForOrderCancelled = async ({
  orderType,
  cancelledBy,
  receiverId,
  serviceType,
  packageName,
}: {
  orderType: "direct" | "custom";
  cancelledBy: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  serviceType?: string;
  packageName?: string;
}) => {
  const sender = await User.findById(cancelledBy).select("name profileImage");
  const receiver = await User.findById(receiverId).select("name email");

  if (!sender || !receiver) return;

  const text =
    orderType === "direct"
      ? `${sender.name} has cancelled the ${packageName || serviceType || "order"}.`
      : `${sender.name} has cancelled your custom ${serviceType || "booking"}.`;

  const payload = {
    userId: cancelledBy,
    receiverId,
    userMsg: {
      image: sender.profileImage || "",
      text,
      photos: [],
    },
    type: "OrderCancelled",
  };

  await emitNotification(payload).catch((err) =>
    console.error("Socket error:", err)
  );

  if (receiver.email) {
    await sendBookingNotificationEmail({
      sentTo: receiver.email,
      subject: "Order Cancelled",
      userName: receiver.name || "",
      messageText: text,
    }).catch((err) => console.error("Email failed:", err));
  }

  console.log("📩 Order cancelled notification sent:", payload);
};