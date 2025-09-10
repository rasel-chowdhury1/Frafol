import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { userService } from './user.service';

import httpStatus from 'http-status';
import { storeFile } from '../../utils/fileHelper';
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

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
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


const getAllUsersOverview = catchAsync(async (req, res) => {
  const {userId} = req.user;
  // Default to the current year if the 'year' query parameter is not provided
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  
  // Ensure the year is valid
  if (isNaN(year)) {
    sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Invalid year parameter.',
      data: null,
    });
  }

  const result = await userService.getUsersOverview(userId, year)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'get all User overview fetched successfully',
    data: result,
  });
});

const getProfessionalPhotographerAndVideographer = catchAsync(async (req: Request, res: Response) => {
  const { page, limit } = req.query;

  const query = {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
  };

  const result = await userService.getProfessionalPhotographerAndVideographer(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Professional photographers and videographers retrieved successfully",
    data: result,
  });
});


const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  
  if (req?.file) {
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
  getMyProfile,
  getAdminProfile,
  updateMyProfile,
  blockedUser,
  deleteMyAccount,
  getAllUsers,
  getAllUsersOverview,
  getProfessionalPhotographerAndVideographer
};
