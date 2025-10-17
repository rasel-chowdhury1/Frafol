import { Router } from 'express';
import auth from '../../middleware/auth';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import { verifyOtpValidations } from '../otp/otp.validation';
import { userController } from './user.controller';
import { userValidation } from './user.validation';
import { USER_ROLE } from './user.constants';
const upload = fileUpload('./public/uploads/profile');

export const userRoutes = Router();

userRoutes
  .post(
    '/create',
    validateRequest(userValidation?.userValidationSchema),
    userController.createUser,
  )

  .post(
    '/create-user-verify-otp',
    validateRequest(verifyOtpValidations.verifyOtpZodSchema),
    userController.userCreateVarification,
  )


  .get(
    '/my-profile',
    auth(
      USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH,USER_ROLE.ADMIN
    ),
    userController.getMyProfile,
  )

  .get(
    '/admin-profile',
    auth(
      'admin'
    ),
    userController.getAdminProfile,
  )

  .get('/all-users', auth("admin"), userController.getAllUsers)

  .get(
    '/stats',
    auth(USER_ROLE.ADMIN),  
    userController.getUserRoleStats
  )

  .get(
    '/pending-professionals',
    auth(USER_ROLE.ADMIN),  
    userController.getPendingPhotographersVideographersBoth
  )



  


// featured profestions routes
  .get(
    "/professionals",
    // auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH),
    userController.getProfessionalPhotographerAndVideographer
  )
  
   
    .get(
    "/professionalsByCategory",
    // auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH),
    userController.getProfessionalUsersByCategory
  )

  .get(
    '/gallery/:id',
    // auth("user", "admin"),
    userController.getUserGalleryById
  )

  .get(
    '/:id',
    // auth("user", "admin"),
    userController.getUserById
  )

 

  .patch(
    '/update-my-profile',
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH,USER_ROLE.ADMIN),
    upload.single('image'),
    parseData(),
    userController.updateMyProfile,
  )

  .patch(
    '/upload-new-photo',
    auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER,USER_ROLE.VIDEOGRAPHER,USER_ROLE.BOTH,USER_ROLE.ADMIN),
    upload.fields([
      { name: 'gallery', maxCount: 10 }
    ]),
    parseData(),
    userController.updateUserGallery,
  )



  .patch(
  "/setUnAvailability",
  auth(
    USER_ROLE.USER,
    USER_ROLE.PHOTOGRAPHER,
    USER_ROLE.VIDEOGRAPHER,
    USER_ROLE.BOTH,
    USER_ROLE.COMPANY,
    USER_ROLE.ADMIN
  ),
  userController.setUnAvailability
)

  .patch(
    '/verified/:userId',
    auth('admin'),
    userController.verifyProfessionalUserController,
  )

  .patch(
    '/declined/:userId',
    auth('admin'),
    userController.declineProfessionalUserController,
  )
  
  .patch(
    '/block/:id',
    auth('admin'),
    userController.blockedUser,
  )
  
  .delete(
    '/delete-my-account',
    auth('user'
    ),
    userController.deleteMyAccount,
  );

// export default userRoutes;
