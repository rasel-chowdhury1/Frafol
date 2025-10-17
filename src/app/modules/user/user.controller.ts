import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { userService } from './user.service';

import httpStatus from 'http-status';
import { storeFile, storeFiles } from '../../utils/fileHelper';


const createUser = catchAsync(async (req: Request, res: Response) => {

  const createUserToken = await userService.createUserToken(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Check email for OTP',
    data:  createUserToken ,
  });
});

const userCreateVarification = catchAsync(async (req, res) => {
  const token = req.headers?.token as string;

  const { otp } = req.body;
  const newUser = await userService.otpVerifyAndCreateUser({ otp, token });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User create successfully',
    data: newUser,
  });
});

const verifyProfessionalUserController = catchAsync(
  async (req: Request, res: Response) => {
    // Extract userId from params and status from request body
    const { userId } = req.params;
    const { status } = req.body;

    const updatedUser = userService.verifyProfessionalUserById(userId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: `User has been ${status === 'verified' ? 'verified' : 'set to pending'} successfully`,
      data: updatedUser,
    });
  }
);

const declineProfessionalUserController = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason } = req.body; // Optional reason for declining

    const declinedUser = userService.declineProfessionalUserById(userId, reason);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Professional user has been declined successfully',
      data: declinedUser,
    });
  }
);

// rest >...............


const getAllUsers = catchAsync(async (req, res) => {
  const {userId} = req.user;
  const result = await userService.getAllUserQuery(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    meta: result.meta,
    data: result.result,
    message: 'Users All are requered successful!!',
  });
});

const getUserRoleStats = catchAsync(async (req, res) => {
  const result = await userService.getUserRoleStats();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User role statistics retrieved successfully.',
    data: result,
  });
});

const getAllPhotographersVideographersBoth = catchAsync(async (req, res) => {
  const result = await userService.getAllPhotographersVideographersBoth(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Photographers, Videographers, and Both retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getPendingPhotographersVideographersBoth = catchAsync(async (req, res) => {
  const result = await userService.getPendingPhotographersVideographersBoth(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All pending Photographers, Videographers, and Both retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserDetailsById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
    data: result,
  });
});

const getUserGalleryById = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserGalleryById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User gallery fetched successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {

  const result = await userService.getMyProfile(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile fetched successfully',
    data: result,
  });
});

const getAdminProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getAdminProfile(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile fetched successfully',
    data: result,
  });
});



const getProfessionalPhotographerAndVideographer = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, ...rest } = req.query;

  const query = {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    ...rest
  };

  const result = await userService.getProfessionalPhotographerAndVideographer(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Professional photographers and videographers retrieved successfully",
    data: result,
  });
});

const getProfessionalUsersByCategory = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, ...rest } = req.query;

  console.log("query data =>> ",req.query)

  const query = {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    ...rest
  };

  const result = await userService.getProfessionalUsersByCategory(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Professional photographers and videographers retrieved successfully",
    data: result,
  });
});


const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  

  // console.log("udpate profile body data =>>>>> ",req.body)
  if (req?.file) {
    // console.log("req file =>>>> ",req.file)
    req.body.profileImage = storeFile('profile', req?.file?.filename);
  }


  const result = await userService.updateUser(req?.user?.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile updated successfully',
    data: result,
  });
});

const updateUserGallery = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId; // Logged-in user
  
  const updateData: { gallery?: string[]; deleteGallery?: string[] } = { ...req.body };

  // Handle file uploads if any
  if (req.files && Object.keys(req.files).length > 0) {
    const files = req.files as { [fieldName: string]: Express.Multer.File[] };
    const uploadedFiles = storeFiles('profile', files);

    if (uploadedFiles.gallery) {
      updateData.gallery = updateData.gallery
        ? [...updateData.gallery, ...uploadedFiles.gallery]
        : uploadedFiles.gallery;
    }
  }

  console.log("Update Data:", updateData);

  const updatedUser = await userService.updateGallery(userId, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User gallery updated successfully",
    data: updatedUser,
  });
});

const setUnAvailability = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;


  const dates: String[] = req.body.unAvailability;

  const updatedUser =  await userService.updateUnAvailability(userId, dates);


  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Availability updated successfully",
    data: updatedUser,
  });
});

const blockedUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.blockedUser(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User ${result.status ? 'blocked': 'unBlocked'} successfully`,
    data: result.user,
  });
});

const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.deleteMyAccount(req.user?.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

export const userController = {
  createUser,
  userCreateVarification,
  getUserById,
  getUserGalleryById,
  getMyProfile,
  getAdminProfile,
  updateMyProfile,
  updateUserGallery,
  setUnAvailability,
  blockedUser,
  deleteMyAccount,
  getAllUsers,
  getUserRoleStats,
  getProfessionalPhotographerAndVideographer,
  getPendingPhotographersVideographersBoth,
  verifyProfessionalUserController,
  declineProfessionalUserController,
  getProfessionalUsersByCategory
};
