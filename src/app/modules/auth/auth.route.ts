import { Router } from 'express';
import { authControllers } from './auth.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { authValidation } from './auth.validation';
import { USER_ROLE } from '../user/user.constants';

export const authRoutes = Router();

authRoutes
  .post('/login', authControllers.login)
  
  .post(
    '/refresh-token',
    validateRequest(authValidation.refreshTokenValidationSchema),
    authControllers.refreshToken,
  )
  .post(
    '/forgot-password-otpByEmail',
    validateRequest(authValidation.forgetPasswordValidationSchemaByEmail),
    authControllers.forgotPassword,
  )

  .post(
    '/forgot-password-otpByNumber',
    validateRequest(authValidation.forgetPasswordValidationSchemaByNumber),
    authControllers.forgotPassword,
  )

  .patch(
    '/change-password',
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH,USER_ROLE.ADMIN),
    authControllers.changePassword,
  )

  .patch(
    '/forgot-password-otp-match',
    validateRequest(authValidation.otpMatchValidationSchema),
    authControllers.forgotPasswordOtpMatch,
  )
  .patch(
    '/forgot-password-reset',
    validateRequest(authValidation.resetPasswordValidationSchema),
    authControllers.resetPassword,
  );
