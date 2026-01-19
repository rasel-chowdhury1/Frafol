import express from 'express';
import { USER_ROLE } from '../user/user.constants';
import { MySubscriptionController } from './mySubscription.controller';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/',
  auth(
    USER_ROLE.PHOTOGRAPHER,
    USER_ROLE.VIDEOGRAPHER,
    USER_ROLE.BOTH,
    USER_ROLE.COMPANY
  ),
  MySubscriptionController.createMySubscription
);

router.get(
  '/me',
  auth(
    USER_ROLE.PHOTOGRAPHER,
    USER_ROLE.VIDEOGRAPHER,
    USER_ROLE.BOTH,
    USER_ROLE.COMPANY
  ),
  MySubscriptionController.getMySubscription
);

router.delete(
  '/cancel',
  auth(
    USER_ROLE.PHOTOGRAPHER,
    USER_ROLE.VIDEOGRAPHER,
    USER_ROLE.BOTH,
    USER_ROLE.COMPANY
  ),
  MySubscriptionController.cancelSubscription
);

export const MySubscriptionRoutes = router;
