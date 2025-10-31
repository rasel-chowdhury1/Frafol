import { Request, Response } from 'express';
import { messageService } from './message.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { IChat } from '../chat/chat.interface';
import Chat from '../chat/chat.model';
import AppError from '../../error/AppError';
import { ChatService } from '../chat/chat.service';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const {text, chatId} = req.body;
  const {userId} = req.user;

    // Validate input data
    if (!text || !chatId) {
       res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Text and chatId are required',
      });
    }
  

  const msgData ={
    text,
    sender: userId,
    chat: chatId
  }
  const result = await messageService.sendMessage(msgData);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

const updateMessage = catchAsync(async (req: Request, res: Response) => {
  const {text} = req.body;
  const {userId} = req.user;
  const {msgId} = req.params;

    // Validate input data
    if (!text) {
       res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Text are required',
      });
    }
  

  const msgUpdateData ={
    userId,
    text,
    msgId
  }
  const result = await messageService.updateMessage(msgUpdateData);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message updated successfully',
    data: result,
  });
});


//seen messages
const seenMessage = catchAsync(async (req: Request, res: Response) => {
  const chatList: IChat | null = await Chat.findById(req.params.chatId);

  if (!chatList) {
    throw new AppError(httpStatus.BAD_REQUEST, 'chat id is not valid');
  }

  console.log({chatList})
  console.log("user id ->>>  ", req.user.userId)

  const result = await messageService.seenMessage(
    req.user.userId,
    req.params.chatId,
  );

  console.log("=== result ===>>> ", result)



  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Message seen successfully',
    data: result,
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const {userId} = req.user;
  const {msgId} = req.params
  const result = await messageService.deleteMessage({userId, msgId});
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message deleted successfully',
    data: result,
  });
})

const getMessagesForChat = catchAsync(async (req: Request, res: Response) => {
  const result = await messageService.getMessagesForChat(req.params.chatId);

  console.log("result ",{result})
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    data: result,
    message: 'Messages fetched successfully',
  });
});

export const messageController = {
  sendMessage,
  getMessagesForChat,
  updateMessage,
  seenMessage,
  deleteMessage
};
