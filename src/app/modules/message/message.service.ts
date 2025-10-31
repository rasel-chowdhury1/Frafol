
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import Message from './message.model';
import Chat from '../chat/chat.model';

const sendMessage = async (data: any) => {
  console.log({data})
   // Check if text, chatId, and sender are provided
   if (!data.text || !data.chat || !data.sender) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Text, chatId, and sender are required');
  }

  // Check if the sender exists in the chat's users
  const chat = await Chat.findById(data.chat);

  if (!chat) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chat not found');
  }

  // Check if the sender is part of the chat's users
  if (!chat.users.includes(data.sender)) {
    throw new AppError(httpStatus.FORBIDDEN, 'Sender is not part of this chat');
  }

  const message = await Message.create(data);
  if (!message) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Message sending failed');
  }
  return message;
};

const updateMessage = async (data: { userId: string, text: string, msgId: string }) => {
  // Check for necessary fields
  if (!data.text || !data.userId || !data.msgId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Text, userId, and msgId are required');
  }

  // Find the message by its ID
  const msg = await Message.findById(data.msgId);

  if (!msg) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  // Check if the user is the sender or part of the chat
  // Assuming the user can update their own message or if they are an admin of the chat (optional)
  if (msg.sender.toString() !== data.userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own messages');
  }

  // Update the message text
  const updatedMessage = await Message.findByIdAndUpdate(
    data.msgId,
    { text: data.text },
    { new: true }
  );

  if (!updatedMessage) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Message update failed');
  }

  return updatedMessage;
};

const seenMessage = async (userId: string, chatId: string) => {
  // Directly update all messages that match the criteria (chatId, seen: false, sender != userId)
  const updateMessages = await Message.updateMany(
    { 
      chat: chatId, 
      seen: false, 
      sender: { $ne: userId },
    },
    {
      $set: { seen: true }, // Set 'seen' to true
      $addToSet: { readBy: userId }, // Add userId to 'readBy' only if not already present
    }
  );

  if (updateMessages.modifiedCount === 0) {
    console.log("No unseen messages found");
  }

  return updateMessages;
};

const deleteMessage = async (data: { userId: string, msgId: string }) => {
  // Check for necessary fields
  if (!data.userId || !data.msgId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Text, userId, and msgId are required');
  }

  // Find the message by its ID
  const msg = await Message.findById(data.msgId);

  if (!msg) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  // Check if the user is the sender or part of the chat
  // Assuming the user can update their own message or if they are an admin of the chat (optional)
  if (msg.sender.toString() !== data.userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own messages');
  }

  // Update the message text
  const deleteMessage = await Message.findByIdAndDelete(
    data.msgId
  );

  if (!deleteMessage) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Message deleted failed');
  }

  return deleteMessage;
};

const getMessagesForChat = async (chatId: string) => {
  return await Message.find({ chat: chatId });
};

export const messageService = {
  sendMessage,
  getMessagesForChat,
  updateMessage,
  seenMessage,
  deleteMessage
};
