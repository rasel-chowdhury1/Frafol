import { Router } from 'express';
import { messageController } from './message.controller';
import auth from '../../middleware/auth';

export const messageRoutes = Router();

messageRoutes
  .post(
    '/send', 
    auth('user', 'admin'), 
    messageController.sendMessage
  )
  .patch(
    '/update/:msgId', 
    auth('user', 'admin'),
    messageController.updateMessage
  )

.patch(
    '/seen/:chatId',
    auth(
      'user',
      'admin'
    ),
    messageController.seenMessage,
  )

  .delete(
    '/delete/:msgId', 
    auth('user', 'admin'),
    messageController.deleteMessage
  )

  .get(
    '/:chatId', 
    auth('user', 'admin'),
    messageController.getMessagesForChat
  );

