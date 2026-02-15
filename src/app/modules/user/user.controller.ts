import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { userService } from './user.service';

import httpStatus from 'http-status';
import { storeFile, storeFiles } from '../../utils/fileHelper';
import AppError from '../../error/AppError';


const createUser = catchAsync(async (req: Request, res: Response) => {

  const createUserToken = await userService.createUserToken(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Check email for OTP',
    data:  createUserToken ,
  });
});


const switchRole = catchAsync(async (req: Request, res: Response) => {
  const {userId} = req.user; // auth middleware adds req.user
  const { newRole } = req.body;

  if (!newRole) {
    throw new AppError(400, "New role is required");
  }

  const result = await userService.switchUserRole(userId, newRole);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Role switched successfully to ${newRole}`,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const {userId} = req.user; // auth middleware adds req.user
  const { newRole } = req.body;

  if (!newRole) {
    throw new AppError(400, "New role is required");
  }

  const result = await userService.updateUserRole(userId, newRole);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Role switched successfully to ${newRole}`,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
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


const getMySubscriptionStatus = catchAsync(async (req: Request, res: Response) => {
  
  const {userId} = req.user;

  const result = await userService.getMySubscriptionStatus(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription status retrieved successfully',
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

const uploadIntroVideo = catchAsync(async (req: Request, res: Response) => {


  if (req?.file) {
    req.body.introVideo = storeFile('video', req?.file?.filename);
  }



  const result = await userService.updateIntroVideo(req?.user?.userId, req.body.introVideo);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Intro video uploaded successfully',
    data: result,
  });

})

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


  const updatedUser = await userService.updateGallery(userId, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User gallery updated successfully",
    data: updatedUser,
  });
});



const updateBannerImages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId; // Logged-in user

  const updateData: {
    bannerImages?: string[];
    deleteGallery?: string[];
  } = {};

  // Get deleteGallery from body if exists
  if (req.body.deleteGallery) {
    updateData.deleteGallery = Array.isArray(req.body.deleteGallery)
      ? req.body.deleteGallery
      : [req.body.deleteGallery];
  }

  // Handle file uploads
  if (req.files && Object.keys(req.files).length > 0) {
    const files = req.files as { [fieldName: string]: Express.Multer.File[] };
    const uploadedFiles = storeFiles('profile', files);

    // ✅ bannerImages upload
    if (uploadedFiles.gallery?.length) {
      updateData.bannerImages = uploadedFiles.gallery;
    }
  }

  const updatedUser = await userService.updateBannerImages(userId, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User banner images updated successfully',
    data: updatedUser,
  });
});


const setUnAvailability = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;


  const dates = req.body.unAvailability as string[];

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


const getUserOverview = catchAsync(async (req, res) => {
  const {userId} = req.user; // or req.params.userId

  const result = await userService.getOverviewOfSpecificUser(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User overview fetched successfully",
    data: result,
  });
});


const getOverviewOfSpecificProfessional = catchAsync(async (req: Request, res: Response) => {
  const {userId} = req.user

  const result =
    await userService.getOverviewOfSpecificProfessional(
      userId
    );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Professional overview fetched successfully",
    data: result,
  });
});


const getMyEarnings = catchAsync(async (req: Request, res: Response) => {
  const { userId: serviceProviderId } = req.user;

  const result =
    await userService.getMyEarnings(serviceProviderId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Earnings history fetched successfully",
    data: result,
  });
});

const getMonthlyEarnings = catchAsync(async (req: Request, res: Response) => {
  const { userId: serviceProviderId } = req.user;
  const { year } = req.query;

  const result =
    await userService.getMonthlyEarningsOfSpecificProfessional(
      serviceProviderId,
      year ? parseInt(year as string) : undefined
    );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Monthly earnings statistics fetched successfully",
    data: result,
  });
});

const getMonthlyCommission = catchAsync(async (req: Request, res: Response) => {
  const { year } = req.query;

  const result =
    await userService.getMonthlyCommission(
      year ? parseInt(year as string) : undefined
    );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Monthly commission statistics fetched successfully",
    data: result,
  });
});

const getAdminDashboardStats = catchAsync(async (req: Request, res: Response) => {

  const {userId} = req.user;

  const result = await userService.getAdminDashboardStats(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin dashboard stats fetched successfully",
    data: result,
  });
});

const getAdminOrderStats = catchAsync(async (req: Request, res: Response) => {
  // ✅ Extract the type query parameter
  const { type } = req.query;

  // ⚠️ Validate type
  if (!type || !["photographer", "videographer", "gear"].includes(String(type))) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message:
        "Invalid type provided. Allowed values are: 'photographer', 'videographer', or 'gear'. Please provide a valid type to fetch order statistics.",
      data: null,
    });
  }

  // ✅ Fetch order statistics from service
  const result = await userService.getAdminOrderStats(
    String(type) as "photographer" | "videographer" | "gear"
  );

  // ✅ Send back structured response
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order statistics for '${type}' fetched successfully. This includes the percentage of completed, pending, and cancelled orders for the selected type.`,
    data: result,
  });
});


const getOrderManagementStats = catchAsync(
  async (req: Request, res: Response) => {
    const stats = await userService.getOrderManagementStats();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Order management stats fetched successfully",
      data: stats,
    });
  }
);


const getOrders = catchAsync(async (req, res) => {
  const { type, ...rest } = req.query;

  const validTypes = ["gear", "professional"] as const;

  const orderType: "gear" | "professional" =
    validTypes.includes(type as any)
      ? (type as "gear" | "professional")
      : "professional"; // default type

  const result = await userService.getOrders(orderType, rest);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders retrieved successfully",
    data: result,
  });
});


const getDeliveryOrders = catchAsync(async (req, res) => {
  const { type, ...rest } = req.query;

  const validTypes = ["professional", "gear"] as const;

  if (!validTypes.includes(type as any)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Invalid type. Allowed: professional, gear",
      data: null,
    });
  }

  const result = await userService.getDeliveryOrders(type as "professional" | "gear", rest);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery orders retrieved successfully",
    data: result,
  });
});


const getLatestGalleryImages = catchAsync(async (_req, res) => {
  const images = await userService.getRandomGalleryImages();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Random gallery images fetched successfully',
    data: images,
  });
});

const getTownAndIndividualCategoriesOptimized = catchAsync(async (_req, res) => {

  const result = await userService.getTownAndIndividualCategoriesOptimized();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Town list and individual photography and videography categories fetched successfully",
    data: result,
  });

})


export const userController = {
  createUser,
  switchRole,
  updateUserRole,
  userCreateVarification,
  getUserById,
  getUserGalleryById,
  getMyProfile,
  getAdminProfile,
  updateMyProfile,
  uploadIntroVideo,
  updateUserGallery,
  updateBannerImages,
  setUnAvailability,
  blockedUser,
  getMySubscriptionStatus,
  deleteMyAccount,
  getAllUsers,
  getUserRoleStats,
  getProfessionalPhotographerAndVideographer,
  getPendingPhotographersVideographersBoth,
  verifyProfessionalUserController,
  declineProfessionalUserController,
  getProfessionalUsersByCategory,
  getOverviewOfSpecificProfessional,
  getUserOverview,
  getMonthlyEarnings,
  getMonthlyCommission,
  getMyEarnings,
  getAdminDashboardStats,
  getAdminOrderStats,
  getOrderManagementStats,
  getOrders,
  getDeliveryOrders,
  getLatestGalleryImages,
  getTownAndIndividualCategoriesOptimized
};
