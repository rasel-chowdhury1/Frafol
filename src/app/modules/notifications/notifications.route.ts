import { Router } from 'express';
import auth from '../../middleware/auth';
import { notificationController } from './notifications.controller';
import { otpControllers } from '../otp/otp.controller';
import { USER_ROLE } from '../user/user.constants';

export const notificationRoutes = Router();



notificationRoutes
  .post(
    "/create",
    auth('user', "admin"),
    notificationController.createNotification
  )
  
  .get(
    '/all-notifications', 
    auth('user'), 
    notificationController.getAllNotifications
  )

  .get(
    '/my-notifications', 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
    notificationController.getMyNotifications
  )

  .patch(
    '/mark-read/:id', 
    auth('user'), 
    notificationController.markAsRead
  )

  .patch(
    "/read-all", 
    auth("user", "admin"), 
    notificationController.markAllAsRead
  )

  
  .delete(
    '/delete/:id', 
    auth('user'), 
    notificationController.deleteNotification
  );
