import express, { NextFunction, Request, Response } from 'express';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import { ChatController } from './chat.controller';
import auth from '../../middleware/auth';
const upload = fileUpload('./public/uploads/chat');

const router = express.Router();

// Add a new chat
router.post(
  '/create',
  auth("user", "admin"),
  ChatController.addNewChat,
);


router.get(
  "/my-chat-list",
  auth("user", "admin"),
  ChatController.getMyChatList
)

router.get(
  "/my-connection-users",
  auth("user", "admin"),
  ChatController.getConnectionUsersOfSpecificUser
)

router.get(
  "/my-online-users",
  auth("user", "admin"),
  ChatController.getOnlineConnectionUsersOfSpecificUser
)


router.patch(
  '/leave-chat/:chatId',
  auth("user", "admin"),
  ChatController.leaveUserFromSpecificChatController,
)



router.get(
  "/:chatId",
  auth("user", "admin"),
  ChatController.getChatById
)




// // Get all chats for a user
// router.get(
//   '/user/:userId',
//   (req: Request, res: Response, next: NextFunction) => {
//     return ChatController.getUserChats(req, res, next);
//   },
// );

// // Get a single chat by ID
// router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
//   return ChatController.getChatById(req, res, next);
// });

// router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
//   return ChatController.updateChatById(req, res, next);
// });

// // Update unread counts
// router.patch(
//   '/:id/unread',
//   (req: Request, res: Response, next: NextFunction) => {
//     return ChatController.updateUnreadCounts(req, res, next);
//   },
// );

// // Block a user
// router.patch('/:chatId/block', auth(USER_ROLE.USER, USER_ROLE.ADMIN), ChatController.blockUser);

// // Unblock a user
// router.patch('/:chatId/unblock', auth(USER_ROLE.USER, USER_ROLE.ADMIN), ChatController.unblockUser);

// // Delete chat for a user (soft delete)
// router.delete('/:chatId/delete', auth(USER_ROLE.USER, USER_ROLE.ADMIN), ChatController.deleteChatForUser);

// Delete a chat
// router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
//   return ChatController.deleteChat(req, res, next);
// });

export const ChatRoutes = router;
