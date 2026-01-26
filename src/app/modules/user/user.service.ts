/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import {
  DeleteAccountPayload,
  IOrderStats,
  OrderStats,
  PaginateQuery,
  TUser,
  TUserCreate,
  VerifiedProfessionalPayload,
} from './user.interface';
import { User } from './user.model';
import config from '../../config';
import QueryBuilder from '../../builder/QueryBuilder';
import { otpServices } from '../otp/otp.service';
import { generateOptAndExpireTime } from '../otp/otp.utils';
import { TPurposeType } from '../otp/otp.interface';
import {
  otpSendEmail,
  profileVerifiedEmail,
} from '../../utils/eamilNotifiacation';
import { createToken, verifyToken } from '../../utils/tokenManage';
import { IProfile } from '../profile/profile.interface';
import Profile from '../profile/profile.model';
import Notification from '../notifications/notifications.model';
import mongoose, { Types } from 'mongoose';
import { getAdminId } from '../../DB/adminStrore';
import { emitNotification } from '../../../socketIo';
import { USER_ROLE, UserRole } from './user.constants';
import fs from 'fs';
import path from 'path';
import { getUserPackageAndReviewStats } from '../package/package.service';
import { GearOrder } from '../gearOrder/gearOrder.model';
import { EventOrder } from '../eventOrder/eventOrder.model';
import { Payment } from '../payment/payment.model';
import { Review } from '../review/review.model';
import { Package } from '../package/package.model';
import { GearMarketplace } from '../gearMarketplace/gearMarketplace.model';
import { Workshop } from '../workshop/workshop.model';
import { aggregateOrders } from './user.utils';
export type IFilter = {
  searchTerm?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export interface OTPVerifyAndCreateUserProps {
  otp: string;
  token: string;
}

const createUserToken = async (payload: TUserCreate) => {
  console.log('before create user => >> ', { payload });

  const {
    name,
    sureName,
    companyName,
    email,
    password,
    role,
    photographerSpecializations,
    videographerSpecializations,
    about,
    zipCode,
    minHourlyRate,
    maxHourlyRate,
    address,
    town,
    country,
    acceptTerms,
    ramcuvaAgree,
    newsLetterSub,
    ico,
    dic,
    ic_dph,
  } = payload;
  let adminVerified = 'pending';
  if (role === 'user' || role === 'company') {
    adminVerified = 'verified';
  }

  // user exist check
  const userExist = await userService.getUserByEmail(email);

  if (userExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exist!!');
  }

  const { isExist, isExpireOtp } = await otpServices.checkOtpByEmail(
    email,
    'email-verification',
  );

  const { otp, expiredAt } = generateOptAndExpireTime();

  let otpPurpose: TPurposeType = 'email-verification';

  if (isExist && !isExpireOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'otp-exist. Check your email.');
  } else if (isExist && isExpireOtp) {
    const otpUpdateData = {
      otp,
      expiredAt,
    };

    await otpServices.updateOtpByEmail(email, otpPurpose, otpUpdateData);
  } else if (!isExist) {
    await otpServices.createOtp({
      name: 'Customer',
      sentTo: email,
      receiverType: 'email',
      purpose: otpPurpose,
      otp,
      expiredAt,
    });
  }

  const otpBody: Partial<TUserCreate> = {
    name,
    sureName,
    companyName,
    email,
    password,
    role,
    photographerSpecializations,
    videographerSpecializations,
    about,
    zipCode,
    minHourlyRate,
    maxHourlyRate,
    address,
    town,
    country,
    acceptTerms,
    ramcuvaAgree,
    newsLetterSub,
    adminVerified,
    ico,
    dic,
    ic_dph,
  };

  // send email
  process.nextTick(async () => {
    await otpSendEmail({
      sentTo: email,
      subject: 'Your one time otp for email  verification',
      name: 'Customer',
      otp,
      expiredAt: expiredAt,
    });
  });

  // crete token
  const createUserToken = createToken({
    payload: otpBody,
    access_secret: config.jwt_access_secret as string,
    expity_time: config.otp_token_expire_time as string | number,
  });

  return createUserToken;
};

const otpVerifyAndCreateUser = async ({
  otp,
  token,
}: OTPVerifyAndCreateUserProps) => {
  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Token not found');
  }

  const decodeData = verifyToken({
    token,
    access_secret: config.jwt_access_secret as string,
  });

  if (!decodeData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not authorised');
  }

  const {
    name,
    sureName,
    companyName,
    email,
    password,
    role,
    photographerSpecializations,
    videographerSpecializations,
    about,
    zipCode,
    minHourlyRate,
    maxHourlyRate,
    address,
    town,
    country,
    acceptTerms,
    ramcuvaAgree,
    newsLetterSub,
    adminVerified,
    ico,
    dic,
    ic_dph,
  } = decodeData;

  // Check OTP
  const isOtpMatch = await otpServices.otpMatch(
    email,
    'email-verification',
    otp,
  );
  if (!isOtpMatch) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP did not match');
  }

  // Update OTP status
  await otpServices.updateOtpByEmail(email, 'email-verification', {
    status: 'verified',
  });

  // Check if user exists
  const isExist = await User.isUserExist(email as string);

  if (isExist) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'User already exists with this email',
    );
  }

  // Create user + profile atomically with transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.create(
      [
        {
          name,
          sureName,
          companyName,
          email,
          password,
          role,
          mainRole: role,
          switchRole: role,
          address,
          town,
          country,
          zipCode,
          photographerSpecializations,
          videographerSpecializations,
          minHourlyRate,
          maxHourlyRate,
          acceptTerms,
          newsLetterSub,
          adminVerified,
          ico,
          dic,
          ic_dph,
        },
      ],
      { session },
    );

    const profileData: IProfile = {
      about,
      acceptTerms,
      ramcuvaAgree,
    };
    const profile = await Profile.create([profileData], { session });

    // Link profile to user
    await User.findByIdAndUpdate(
      user[0]._id,
      { profileId: profile[0]._id },
      { new: true, session },
    );

    await session.commitTransaction();
    session.endSession();

    const notificationData = {
      userId: user[0]._id,
      receiverId: getAdminId(),
      userMsg: {
        fullName: user[0].name || '',
        image: user[0].profileImage || '', // Placeholder image URL (adjust this)
        text: 'New user added in your app',
      },
      type: 'added',
    } as any;

    // emit notification in background, don’t block response
    emitNotification(notificationData).catch((err) => {
      console.error('Notification emit failed:', err);
    });
    // Generate access token
    const jwtPayload = {
      userId: user[0]._id.toString(),
      name: user[0].name || '',
      sureName: user[0].sureName,
      companyName: user[0].companyName || '',
      email: user[0].email,
      role: user[0].role,
      mainRole: user[0].mainRole,
    };

    return createToken({
      payload: jwtPayload,
      access_secret: config.jwt_access_secret as string,
      expity_time: '5m',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed');
  }
};

const switchUserRole = async (userId: string, newRole: string) => {
  // 1️⃣ Validate user existence
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // 2️⃣ Check if newRole is valid
  const allowedRoles = [
    'user',
    'photographer',
    'videographer',
    'both',
    'company',
  ];

  if (!allowedRoles.includes(newRole)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid role selected');
  }

  // 3️⃣ Check if user already has that role
  if (user.switchRole === newRole) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already has this role');
  }

  // 4️⃣ Update switchRole
  user.switchRole = newRole;
  await user.save();

  // 5️⃣ Generate new JWT tokens
  const jwtPayload = {
    userId: user._id.toString(),
    name: user.name || '',
    sureName: user.sureName || '',
    companyName: user.companyName || '',
    email: user.email,
    role: user.role,
    switchRole: user.switchRole,
  };

  const accessToken = createToken({
    payload: jwtPayload,
    access_secret: config.jwt_access_secret as string,
    expity_time: config.jwt_access_expires_in as string,
  });

  const refreshToken = createToken({
    payload: jwtPayload,
    access_secret: config.jwt_refresh_secret as string,
    expity_time: config.jwt_refresh_expires_in as string,
  });

  return {
    user: {
      _id: user._id,
      name: user.name,
      sureName: user.sureName,
      companyName: user.companyName,
      role: user.role,
      switchRole: user.switchRole,
      email: user.email,
      profileImage: user.profileImage,
    },
    accessToken,
    refreshToken,
  };
};

const updateUser = async (userId: string, payload: Partial<TUser>) => {
  const {
    role,
    email,
    isBlocked,
    isDeleted,
    password,
    about,
    bankName,
    accountNumber,
    routingNumber,
    ...rest
  } = payload;

  // 1️⃣ Find existing user
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  // 2️⃣ Handle profile fields
  if (about || bankName || accountNumber) {
    let profile;
    if (user.profileId) {
      profile = await Profile.findByIdAndUpdate(
        user.profileId,
        { about, bankName, accountNumber },
        { new: true },
      );
    } else {
      profile = await Profile.create({
        about,
        bankName,
        accountNumber,
        routingNumber,
      });
      (user.profileId as any) = profile._id; // Keep as ObjectId
      await user.save();
    }
  }

  // Delete previous profile image if a new one is uploaded
  if (payload.profileImage && user.profileImage) {
    const oldFilePath = path.join(process.cwd(), 'public', user.profileImage); // include public folder
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log(`Deleted previous profile image: ${oldFilePath}`);
    }
  }

  // Merge rest fields with profileImage if present
  const updateData = {
    ...rest,
    ...(payload.profileImage ? { profileImage: payload.profileImage } : {}),
  };

  // Update user in DB
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  });

  if (!updatedUser) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User updating failed');
  }

  const jwtPayload: {
    userId: string;
    name: string;
    sureName: string;
    companyName: string;
    email: string;
    profileImage: string;
    role: string;
    switchRole: string;
  } = {
    userId: updatedUser?._id?.toString() as string,
    name: updatedUser.name || '',
    sureName: updatedUser.sureName || '',
    companyName: updatedUser.companyName || '',
    email: updatedUser.email,
    profileImage: updatedUser.profileImage || '',
    role: updatedUser?.role,
    switchRole: updatedUser.switchRole,
  };

  const accessToken = createToken({
    payload: jwtPayload,
    access_secret: config.jwt_access_secret as string,
    expity_time: config.jwt_access_expires_in as string,
  });

  const refreshToken = createToken({
    payload: jwtPayload,
    access_secret: config.jwt_refresh_secret as string,
    expity_time: config.jwt_refresh_expires_in as string,
  });

  return {
    user: updatedUser,
    accessToken,
    refreshToken,
  };
};

const updateGallery = async (
  userId: string,
  updateData: { gallery?: string[]; deleteGallery?: string[] },
) => {
  console.log('updateData ->>> ', { ...updateData });

  // Fetch the current business first
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new Error('User not found');
  }

  let newGallery = (existingUser as any).gallery || [];

  // Remove images if deleteGallery is provided
  if (updateData.deleteGallery && updateData.deleteGallery.length > 0) {
    updateData.deleteGallery.forEach((imgPath) => {
      // Convert relative path to absolute server path
      const fullPath = path.join(process.cwd(), 'public', imgPath); // process.cwd() gives root of project
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      } else {
        console.log(`File not found: ${fullPath}`);
      }
    });

    // Remove deleted images from gallery array
    newGallery = newGallery.filter(
      (img) => !updateData.deleteGallery?.includes(img),
    );
  }
  // Append new images if provided
  if (updateData.gallery && updateData.gallery.length > 0) {
    newGallery = [...newGallery, ...updateData.gallery];
  }

  // Update the gallery in updateData
  updateData.gallery = newGallery;

  // Remove deleteGallery from updateData to avoid saving it in DB
  delete updateData.deleteGallery;

  const updatedBusiness = await User.findByIdAndUpdate(
    userId,
    { ...updateData },
    { new: true },
  );

  return updatedBusiness;
};


const updateBannerImages = async (
  userId: string,
  updateData: { bannerImages?: string[]; deleteGallery?: string[] },
) => {

  // Fetch existing user
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new Error('User not found');
  }


  let updatedBannerImages = existingUser.bannerImages || [];



  // 🗑️ Remove images
  if (updateData.deleteGallery?.length) {
    updateData.deleteGallery.forEach((imgPath) => {
      const fullPath = path.join(process.cwd(), 'public', imgPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    updatedBannerImages = updatedBannerImages.filter(
      (img) => !updateData.deleteGallery?.includes(img),
    );
  }



  // ➕ Add new images
  if (updateData.bannerImages?.length) {
    updatedBannerImages = [
      ...updatedBannerImages,
      ...updateData.bannerImages,
    ];
  }

  

  // ✅ Save to bannerImages field
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { bannerImages: updatedBannerImages },
    { new: true },
  );

  return updatedUser;
};

const updateIntroVideo = async (
  userId: string,
  updateData: string,
) => {

  // Fetch the current business first
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new Error('User not found');
  }


  if(existingUser.introVideo){
    const oldFilePath = path.join(process.cwd(), 'public', existingUser.introVideo); // include public folder
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log(`Deleted previous profile image: ${oldFilePath}`);
    }
  }


  const updatedBusiness = await User.findByIdAndUpdate(
    userId,
    { introVideo: updateData },
    { new: true },
  );

  return updatedBusiness;
};

const verifyProfessionalUserById = async (userId: string, status?: string) => {
  const updatedStatus = status ? status : 'verified';

  const user = await User.findByIdAndUpdate(
    userId,
    { adminVerified: updatedStatus },
    { new: true, runValidators: true },
  ).select('-password');

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User verification update failed',
    );
  }

  // 🔥 Fire-and-forget email (non-blocking)
  if (updatedStatus === 'verified') {
    profileVerifiedEmail({
      sentTo: user.email,
      subject: 'Good News! Your Frafol Account Is Now Verified',
      name: user.name || 'User',
    }).catch((error) => {
      console.error('Profile verified email failed:', error);
    });
  }

  return user;
};

const declineProfessionalUserById = async (userId: string, reason?: string) => {
  // Soft delete + mark as declined
  const user = await User.findByIdAndUpdate(
    userId,
    {
      isDeleted: true,
      adminVerified: 'declined', // optional, could use 'declined' if you add this enum
    },
    { new: true, runValidators: true },
  ).select('-password'); // exclude password

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to decline the professional user',
    );
  }

  return user;
};

const updateUnAvailability = async (userId: string, dates: string[]) => {
  // Find the user
  const user = (await User.findById(userId)) as any;
  if (!user) throw new Error('User not found');

  // Convert existing dates (if any) to plain strings
  // const existingDates = (user.unAvailability || []).map(String);

  // Merge old + new dates, remove duplicates
  const uniqueDates = Array.from(new Set(dates));

  // Store as plain string array (no Date objects)
  user.unAvailability = uniqueDates;

  // Save updated user
  await user.save();

  return user;
};

// ............................rest

const getProfessionalPhotographerAndVideographer = async (
  query: Record<string, unknown>,
) => {
  const { role, ...rest } = query;



  // ✅ Determine applicable roles in a single expression
  const roles: UserRole[] = role
    ? [role as UserRole, USER_ROLE.BOTH]
    : [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH];

  // ✅ Base condition (reusable and consistent)
  const baseCondition = {
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  };


  // ✅ Initialize QueryBuilder
  const userQuery = new QueryBuilder(User.find(baseCondition), rest)
    .search(['name', 'sureName', 'town', 'country'])
    .filter()
    .sort()
    .paginate()
    .fields();

  // ✅ Fetch results (sorted by rating by default)
  const result = await userQuery.modelQuery
    .sort({ averageRating: -1 })
    .select(
      'name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview hasActiveSubscription',
    );

  // ✅ Fetch meta information
  const meta = await userQuery.countTotal();

  return { meta, result };
};

// const getProfessionalPhotographerAndVideographer = async (query: PaginateQuery) => {

//   const { role } = query;

//   console.log("role==>>> ", role)
//   console.log("query==>>> ", query)

// let roles: UserRole[];
// if (!role) {
//   roles = [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH];
// } else {
//   roles = [role as UserRole, USER_ROLE.BOTH]; // fixed: initialize as array instead of pushing to undefined
// }

//   const page = Number(query.page) || 1;
//   const limit = Number(query.limit) || 10;
//   const skip = (page - 1) * limit;

//   // Fetch total count
//   const total = await User.countDocuments({
//     role: { $in: roles },
//     isDeleted: false,
//     isBlocked: false,
//   });

//   // Fetch paginated results sorted by averageRating descending
//   const result = await User.find({
//     role: { $in: roles },
//     isDeleted: false,
//     isBlocked: false,
//   })
//     .sort({ averageRating: -1 }) // highest rating first
//     .skip(skip)
//     .limit(limit)
//     .select("name sureName role profileImage town address country hourlyRate averageRating totalReview ");

//   const totalPage = Math.ceil(total / limit);

//   return {
//     meta: { page, limit, total, totalPage },
//     result,
//   };
// };

const getProfessionalUsersByCategory = async (
  query: Record<string, unknown>,
) => {
  console.log('query data=>>. ', query);
  const { role, categoryType, ...rest } = query;

  // Determine roles to filter
  const roles = role
    ? [role, USER_ROLE.BOTH]
    : [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH];

  console.log({ roles });

  // Base query
  let baseFilter: any = {
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  };

  console.log('cateogory type==>>> ', categoryType);
  // Apply categoryType filter depending on role
  if (categoryType) {
    const regex = new RegExp(categoryType as string, 'i');

    console.log({ regex });

    if (role === USER_ROLE.PHOTOGRAPHER) {
      baseFilter.photographerSpecializations = {
        $elemMatch: { $regex: regex },
      };
    } else if (role === USER_ROLE.VIDEOGRAPHER) {
      baseFilter.videographerSpecializations = {
        $elemMatch: { $regex: regex },
      };
    } else if (role === USER_ROLE.BOTH) {
      baseFilter.$or = [
        { photographerSpecializations: { $elemMatch: { $regex: regex } } },
        { videographerSpecializations: { $elemMatch: { $regex: regex } } },
      ];
    }
  }

  // Build initial query
  let baseQuery = User.find(baseFilter).select(
    'name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview photographerSpecializations videographerSpecializations hasActiveSubscription',
  );

  console.log({ baseFilter, baseQuery, query });

  // Use QueryBuilder
  const userQuery = new QueryBuilder(baseQuery, rest)
    .search(['name', 'sureName']) // searchable fields
    .filter() // other filters
    .sort()
    .paginate()
    .fields();

  // Execute query
  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getProfessionalVideographers = async (query: PaginateQuery) => {
  const roles = [USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH];

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Fetch total count
  const total = await User.countDocuments({
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  });

  // Fetch paginated results sorted by averageRating descending
  const result = await User.find({
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  })
    .sort({ averageRating: -1 }) // highest rating first
    .skip(skip)
    .limit(limit)
    .select(
      'name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview ',
    );

  const totalPage = Math.ceil(total / limit);

  return {
    meta: { page, limit, total, totalPage },
    result,
  };
};

const getProfessionalPhotographers = async (query: PaginateQuery) => {
  const roles = [USER_ROLE.PHOTOGRAPHER, USER_ROLE.BOTH];

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Fetch total count
  const total = await User.countDocuments({
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  });

  // Fetch paginated results sorted by averageRating descending
  const result = await User.find({
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  })
    .sort({ averageRating: -1 }) // highest rating first
    .skip(skip)
    .limit(limit)
    .select(
      'name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview ',
    );

  const totalPage = Math.ceil(total / limit);

  return {
    meta: { page, limit, total, totalPage },
    result,
  };
};

const getAllUserQuery = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const { type, ...rest } = query;

  // Base filter: exclude the requesting user
  let filter: Record<string, any> = { _id: { $ne: userId } };

  // Apply type filter only if type exists
  if (type === 'professional') {
    filter.role = {
      $in: [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH],
    };
  } else if (type === 'user') {
    filter.role = { $in: [USER_ROLE.USER, USER_ROLE.COMPANY] };
  }

  filter.adminVerified = 'verified';
  // if type is undefined or invalid, no role filter is applied (all users included)

  // Build query with QueryBuilder
  const userQuery = new QueryBuilder(User.find(filter), rest)
    .search(['fullName'])
    .filter()
    .sort()
    .paginate()
    .fields();

  // 🔹 populate profile and get only "about"
  userQuery.modelQuery = userQuery.modelQuery.populate({
    path: 'profileId',
    select: 'about',
  });

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getAllPhotographersVideographersBoth = async (
  query: Record<string, any> = {},
) => {
  // Filter users by role
  const roleFilter = {
    role: {
      $in: [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH],
    },
    adminVerified: 'verified',
    isDeleted: false,
    isBlocked: false,
  };

  const userQuery = new QueryBuilder(User.find(roleFilter), query)
    .search(['name', 'sureName', 'email']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getPendingPhotographersVideographersBoth = async (
  query: Record<string, any> = {},
) => {
  // Filter users by role
  const roleFilter = {
    role: {
      $in: [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH],
    },
    adminVerified: 'pending',
    isDeleted: false,
    isBlocked: false,
  };

  const userQuery = new QueryBuilder(User.find(roleFilter), query)
    .search(['name', 'sureName', 'email']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  // 🔹 populate profile and get only "about"
  userQuery.modelQuery = userQuery.modelQuery.populate({
    path: 'profileId',
    select: 'about',
  });

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getAllUserCount = async () => {
  const allUserCount = await User.countDocuments();
  return allUserCount;
};

const getUserRoleStats = async () => {
  const result = await User.aggregate([
    {
      $match: { adminVerified: 'verified', isDeleted: false },
    },
    {
      $group: {
        _id: null,
        totalPhotographer: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.PHOTOGRAPHER] }, 1, 0] },
        },
        totalVideographer: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.VIDEOGRAPHER] }, 1, 0] },
        },
        totalBoth: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.BOTH] }, 1, 0] },
        },
        totalUserCompany: {
          $sum: {
            $cond: [
              { $in: ['$role', [USER_ROLE.USER, USER_ROLE.COMPANY]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    result[0] || {
      totalPhotographer: 0,
      totalVideographer: 0,
      totalBoth: 0,
      totalUserCompany: 0,
    }
  );
};

const getUserById = async (id: string) => {
  const result = await User.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
};

const getUserGalleryById = async (id: string) => {
  const result = await User.findById(id).select('gallery');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
};

const getUserDetailsById = async (userId: string) => {
  // ✅ Fetch user with selected fields and populated profile
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
    isBlocked: false,
  }).populate({
    path: 'profileId',
    select: 'about',
    model: 'Profile',
  });

  // ✅ Handle user not found
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // 3️⃣ Fetch user's package and review stats
  const packageAndReviewStats = await getUserPackageAndReviewStats(userId);

  return {
    ...user.toObject(),
    starCounts: packageAndReviewStats.starCounts,
    package: packageAndReviewStats.packages,
  };
};

// Optimized the function to improve performance, reducing the processing time to 235 milliseconds.
const getMyProfile = async (id: string) => {
  const result = await User.findById(id).populate('profileId');
  return result;
};

const getAdminProfile = async (id: string) => {
  const result = await User.findById(id).lean();

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return result;
};

const getUserByEmail = async (email: string) => {
  const result = await User.findOne({ email });

  return result;
};

const getMySubscriptionStatus = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user id');
  }

  const user = await User.findById(userId).select(
    'hasActiveSubscription subscriptionExpiryDate subscriptionDays'
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return {
    hasActiveSubscription: user.hasActiveSubscription,
    subscriptionExpiryDate: user.subscriptionExpiryDate,
    subscriptionDays: user.subscriptionDays,
  };
};

const deleteMyAccount = async (id: string, payload: DeleteAccountPayload) => {
  const user: TUser | null = await User.IsUserExistById(id);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  if (!(await User.isPasswordMatched(payload.password, user.password))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password does not match');
  }

  const userDeleted = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!userDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  return userDeleted;
};

const blockedUser = async (id: string) => {
  const singleUser = await User.IsUserExistById(id);

  if (!singleUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // let status;

  // if (singleUser?.isActive) {
  //   status = false;
  // } else {
  //   status = true;
  // }
  let status = !singleUser.isBlocked;
  const user = await User.findByIdAndUpdate(
    id,
    { isBlocked: status },
    { new: true },
  );

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  return { status, user };
};

const getOverviewOfSpecificUser = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(400, 'Invalid userId');
  }

  const userObjectId = new Types.ObjectId(userId);

  // 1️⃣ Fetch user info in parallel with other aggregations
  const [userInfo, eventStats, gearStats, paymentStats, latestNotifications] =
    await Promise.all([
      User.findById(userObjectId).select('name '),

      // Event Orders aggregation
      EventOrder.aggregate([
        { $match: { userId: userObjectId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalActive: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      ['inProgress', 'deliveryRequest', 'cancelRequest'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalPendingConfirmation: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            totalCompleted: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            totalPaymentPending: {
              $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
            },
            totalDeliveryConfirmation: {
              $sum: { $cond: [{ $eq: ['$status', 'deliveryRequest'] }, 1, 0] },
            },
            totalCancelRequestConfirmation: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelRequest'] }, 1, 0] },
            },
          },
        },
      ]),

      // Gear Orders aggregation
      GearOrder.aggregate([
        { $match: { clientId: userObjectId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalActive: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$orderStatus',
                      ['inProgress', 'deliveryRequest', 'cancelRequest'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalPendingConfirmation: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] },
            },
            totalCompleted: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] },
            },
            totalPaymentPending: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'accepted'] }, 1, 0] },
            },
            totalDeliveryConfirmation: {
              $sum: {
                $cond: [{ $eq: ['$orderStatus', 'deliveryRequest'] }, 1, 0],
              },
            },
            totalCancelRequestConfirmation: {
              $sum: {
                $cond: [{ $eq: ['$orderStatus', 'cancelRequest'] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Payment stats
      Payment.aggregate([
        { $match: { userId: userObjectId, paymentStatus: 'completed' } },
        { $group: { _id: null, totalSpent: { $sum: '$totalAmount' } } },
      ]),

      // Latest notifications
      Notification.find({ receiverId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name profileImage')
        .populate('receiverId', 'name profileImage'),
    ]);

  const event = eventStats[0] || {
    totalActive: 0,
    totalPendingConfirmation: 0,
    totalCompleted: 0,
    totalPaymentPending: 0,
    totalDeliveryConfirmation: 0,
    totalCancelRequestConfirmation: 0,
  };

  const gear = gearStats[0] || {
    totalActive: 0,
    totalPendingConfirmation: 0,
    totalCompleted: 0,
    totalPaymentPending: 0,
    totalDeliveryConfirmation: 0,
    totalCancelRequestConfirmation: 0,
  };

  const totalSpent = paymentStats[0]?.totalSpent || 0;

  return {
    user: userInfo?.name || '',
    totalActiveOrders: event.totalActive + gear.totalActive,
    totalPendingConfirmation:
      event.totalPendingConfirmation + gear.totalPendingConfirmation,
    totalCompletedOrders: event.totalCompleted + gear.totalCompleted,
    totalSpent,
    actionRequired: {
      totalPaymentPending: event.totalPaymentPending + gear.totalPaymentPending,
      totalDeliveryConfirmation:
        event.totalDeliveryConfirmation + gear.totalDeliveryConfirmation,
      totalCancelRequestConfirmation:
        event.totalCancelRequestConfirmation +
        gear.totalCancelRequestConfirmation,
    },
    latestNotifications,
  };
};

const getOverviewOfSpecificProfessional = async (serviceProviderId: string) => {
  if (!Types.ObjectId.isValid(serviceProviderId)) {
    throw new Error('Invalid serviceProviderId');
  }

  const providerObjectId = new Types.ObjectId(serviceProviderId);

  // Run all in parallel for efficiency
  const [
    userInfo,
    totalPendingGearOrders,
    totalUpcomingEvents,
    totalOverallEarningsAgg,
    totalReviewsReceived,
  ] = await Promise.all([
    // ✅ Fetch service provider user info
    User.findById(providerObjectId).select('name'),
    // 🧾 Pending gear orders
    GearOrder.countDocuments({
      sellerId: providerObjectId,
      orderStatus: 'pending',
      isDeleted: false,
    }),

    // 🗓️ Upcoming accepted or in-progress events
    EventOrder.countDocuments({
      serviceProviderId: providerObjectId,
      isDeleted: false,
      status: { $in: ['accepted', 'inProgress'] },
      date: { $gte: new Date() },
    }),

    // 💰 Calculate total earnings from completed payments
    Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          $or: [
            { serviceProviderId: providerObjectId },
            { 'serviceProviders.serviceProviderId': providerObjectId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$serviceProviderId', providerObjectId] },
                '$netAmount', // direct match
                {
                  // inside serviceProviders array
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$serviceProviders',
                          as: 'sp',
                          cond: {
                            $eq: ['$$sp.serviceProviderId', providerObjectId],
                          },
                        },
                      },
                      as: 'matched',
                      in: '$$matched.netAmount',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ]),

    // ⭐ Reviews count
    Review.countDocuments({
      serviceProviderId: providerObjectId,
      isDeleted: false,
    }),
  ]);

  const totalOverallEarnings =
    totalOverallEarningsAgg.length > 0
      ? totalOverallEarningsAgg[0].totalEarnings
      : 0;

  return {
    user: userInfo?.name || '',
    totalPendingGearOrders,
    totalUpcomingEvents,
    totalOverallEarnings,
    totalReviewsReceived,
  };
};

const getMyEarnings = async (
  serviceProviderId: string,
  query: Record<string, unknown>,
) => {
  if (!Types.ObjectId.isValid(serviceProviderId)) {
    throw new Error('Invalid serviceProviderId');
  }

  const filter = {
    serviceProviderId: new Types.ObjectId(serviceProviderId),
    paymentStatus: 'completed',
    isDeleted: false,
  };

  const earningsQuery = new QueryBuilder(
    Payment.find(filter).populate('userId', 'name profileImage email'),
    query,
  )
    .search(['transactionId', 'paymentType', 'method'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await earningsQuery.modelQuery;
  const meta = await earningsQuery.countTotal();

  return { meta, result };
};

const getMonthlyEarningsOfSpecificProfessional = async (
  serviceProviderId: string,
  year?: number,
) => {
  if (!Types.ObjectId.isValid(serviceProviderId)) {
    throw new Error('Invalid serviceProviderId');
  }

  const providerObjectId = new Types.ObjectId(serviceProviderId);
  const targetYear = year || new Date().getFullYear();

  // 🧾 Aggregate earnings grouped by month
  const monthlyAgg = await Payment.aggregate([
    {
      $match: {
        paymentStatus: 'completed',
        createdAt: {
          $gte: new Date(`${targetYear}-01-01T00:00:00Z`),
          $lte: new Date(`${targetYear}-12-31T23:59:59Z`),
        },
        $or: [
          { serviceProviderId: providerObjectId },
          { 'serviceProviders.serviceProviderId': providerObjectId },
        ],
      },
    },
    {
      $addFields: {
        matchedNetAmount: {
          $cond: [
            { $eq: ['$serviceProviderId', providerObjectId] },
            '$netAmount',
            {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$serviceProviders',
                      as: 'sp',
                      cond: {
                        $eq: ['$$sp.serviceProviderId', providerObjectId],
                      },
                    },
                  },
                  as: 'matched',
                  in: '$$matched.netAmount',
                },
              },
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalEarnings: { $sum: '$matchedNetAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 🧮 Map to 12-month structure
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(0, i).toLocaleString('default', { month: 'short' }), // Jan, Feb...
    totalEarnings: monthlyAgg.find((m) => m._id === i + 1)?.totalEarnings || 0,
  }));

  return {
    year: targetYear,
    monthlyEarnings: monthlyData,
  };
};

const getMonthlyCommission = async (year?: number) => {
  const targetYear = year || new Date().getFullYear();

  // 🧾 Aggregate commission grouped by month
  const monthlyAgg = await Payment.aggregate([
    {
      $match: {
        paymentStatus: 'completed',
        commission: { $gt: 0 },
        createdAt: {
          $gte: new Date(`${targetYear}-01-01T00:00:00Z`),
          $lte: new Date(`${targetYear}-12-31T23:59:59Z`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalCommission: { $sum: '$commission' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 🧮 Map to 12-month structure
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(0, i).toLocaleString('default', { month: 'short' }), // Jan, Feb...
    totalCommission:
      monthlyAgg.find((m) => m._id === i + 1)?.totalCommission || 0,
  }));

  return {
    year: targetYear,
    monthlyCommission: monthlyData,
  };
};

const getAdminDashboardStats = async (adminId: string) => {
  if (!Types.ObjectId.isValid(adminId)) {
    throw new Error('Invalid adminId');
  }
  const adminObjectId = new Types.ObjectId(adminId);

  // ✅ Aggregate user stats in one query
  const userStats = await User.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalRegularUsers: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.USER] }, 1, 0] },
        },
        totalProfessionals: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$role',
                  [
                    USER_ROLE.PHOTOGRAPHER,
                    USER_ROLE.VIDEOGRAPHER,
                    USER_ROLE.BOTH,
                  ],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const {
    totalUsers = 0,
    totalRegularUsers = 0,
    totalProfessionals = 0,
  } = userStats[0] || {};

  // ✅ Active Event Orders count
  const activeEventOrders = await EventOrder.countDocuments({
    status: { $in: ['accepted', 'inProgress', 'deliveryRequest'] },
  });

  // ✅ Total commission
  const commissionAgg = await Payment.aggregate([
    { $match: { paymentStatus: 'completed', commission: { $gt: 0 } } },
    { $group: { _id: null, totalCommission: { $sum: '$commission' } } },
  ]);
  const totalCommission = commissionAgg[0]?.totalCommission || 0;

  // ✅ Quick actions
  const [
    totalPendingUsers,
    totalPendingPackages,
    totalPendingGears,
    totalPendingWorkshops,
    confirmedEventOrders,
    confirmedGearOrders,
  ] = await Promise.all([
    User.countDocuments({ adminVerified: 'pending', isDeleted: false }),
    Package.countDocuments({ approvalStatus: 'pending', isDeleted: false }),
    GearMarketplace.countDocuments({
      approvalStatus: 'pending',
      isDeleted: false,
    }),
    Workshop.countDocuments({ approvalStatus: 'pending', isDeleted: false }),
    EventOrder.countDocuments({ status: 'confirmed', isDeleted: false }),
    GearOrder.countDocuments({ status: 'confirmed', isDeleted: false }),
  ]);

  // Combine confirmed deliveries into one variable
  const totalConfirmedDeliveries = confirmedEventOrders + confirmedGearOrders;

  const quickActions = {
    totalPendingUsers,
    totalPendingPackages,
    totalPendingGears,
    totalPendingWorkshops,
    totalConfirmedDeliveries, // combined deliveries
  };

  // ✅ Fetch latest 10 notifications for this admin only
  const latestNotifications = await Notification.find({
    receiverId: adminObjectId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'name profileImage')
    .populate('receiverId', 'name profileImage');

  return {
    totalUsers,
    totalRegularUsers,
    totalProfessionals,
    activeEventOrders,
    totalCommission,
    quickActions, // all quick actions in one variable
    latestNotifications,
  };
}; 

const getAdminOrderStats = async (
  type: 'photographer' | 'videographer' | 'gear',
): Promise<OrderStats> => {
  let model;
  let matchStage = {};

  switch (type) {
    case 'photographer':
      model = EventOrder;
      matchStage = { serviceType: 'photography' }; // Only photography event orders
      break;
    case 'videographer':
      model = EventOrder;
      matchStage = { serviceType: 'videography' }; // Only videography event orders
      break;
    case 'gear':
      model = GearOrder;
      matchStage = {}; // All gear orders
      break;
    default:
      throw new Error('Invalid type');
  }

  const stats = await model.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalOrders = stats.reduce((sum, item) => sum + item.count, 0);
  const completed =
    stats.find((s) => s._id === 'delivered' || s._id === 'completed')?.count ||
    0;
  const pending = stats.find((s) => s._id === 'pending')?.count || 0;
  const cancelled =
    stats.find((s) =>
      ['cancelled', 'cancelRequestDeclined', 'declined'].includes(s._id),
    )?.count || 0;

  const percentage = (count: number) =>
    totalOrders > 0 ? (count / totalOrders) * 100 : 0;

  return {
    totalOrders,
    completedPercentage: parseFloat(percentage(completed).toFixed(2)),
    pendingPercentage: parseFloat(percentage(pending).toFixed(2)),
    cancelledPercentage: parseFloat(percentage(cancelled).toFixed(2)),
  };
};

const getOrderManagementStats = async (): Promise<IOrderStats> => {
  // ✅ Aggregate EventOrders & GearOrders in parallel
  const [eventStats, gearStats] = await Promise.all([
    aggregateOrders(EventOrder),
    aggregateOrders(GearOrder),
  ]);

  return {
    totalOrders: eventStats.total + gearStats.total,
    completedOrders: eventStats.completed + gearStats.completed,
    activeOrders: eventStats.active + gearStats.active,
    cancelledOrders: eventStats.cancelled + gearStats.cancelled,
  };
};

const getOrders = async (
  type: 'professional' | 'gear',
  query: Record<string, unknown>,
) => {
  let model: any;
  let queryBuilder;

  if (type === 'professional') {
    model = EventOrder;
    queryBuilder = model
      .find()
      .populate('userId')
      .populate('serviceProviderId');
  } else if (type === 'gear') {
    model = GearOrder;
    queryBuilder = model.find().populate('clientId').populate('sellerId');
  } else {
    throw new Error('Invalid type. Allowed: professional, gear');
  }

  const orderQuery = new QueryBuilder(queryBuilder, query)
    .search(['orderId'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const orders = await orderQuery.modelQuery;
  const meta = await orderQuery.countTotal();

  return { meta, orders };
};

const getDeliveryOrders = async (
  type: 'professional' | 'gear',
  query: Record<string, unknown>,
) => {
  let model: any;
  let deliveryStatuses: string[] = [];
  let baseQuery: any;

  if (type === 'professional') {
    model = EventOrder;
    deliveryStatuses = ['deliveryRequest', 'deliveryAccepted', 'delivered'];
    baseQuery = model
      .find({ status: { $in: deliveryStatuses } })
      .populate('userId', 'name email profileImage')
      .populate('serviceProviderId', 'name email profileImage');
  } else if (type === 'gear') {
    model = GearOrder;
    deliveryStatuses = [
      'deliveryRequest',
      'deliveryRequestDeclined',
      'delivered',
    ];
    baseQuery = model
      .find({ orderStatus: { $in: deliveryStatuses } })
      .populate('clientId', 'name email profileImage')
      .populate('sellerId', 'name email profileImage')
      .populate('gearMarketplaceId');
  } else {
    throw new Error('Invalid type. Allowed: professional, gear');
  }

  const deliveryQuery = new QueryBuilder(baseQuery, query)
    .search(['orderId'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const orders = await deliveryQuery.modelQuery;
  const meta = await deliveryQuery.countTotal();

  return { meta, orders };
};

export const userService = {
  createUserToken,
  switchUserRole,
  otpVerifyAndCreateUser,
  getMyProfile,
  getAdminProfile,
  getUserById,
  getUserDetailsById,
  getUserGalleryById,
  getUserByEmail,
  updateUser,
  updateGallery,
  updateBannerImages,
  updateIntroVideo,
  updateUnAvailability,
  verifyProfessionalUserById,
  declineProfessionalUserById,
  getMySubscriptionStatus,
  deleteMyAccount,
  blockedUser,
  getAllUserQuery,
  getAllUserCount,
  getUserRoleStats,
  getAllPhotographersVideographersBoth,
  getPendingPhotographersVideographersBoth,
  getProfessionalPhotographerAndVideographer,
  getProfessionalUsersByCategory,
  getOverviewOfSpecificProfessional,
  getOverviewOfSpecificUser,
  getMonthlyEarningsOfSpecificProfessional,
  getMonthlyCommission,
  getMyEarnings,
  getAdminDashboardStats,
  getAdminOrderStats,
  getOrderManagementStats,
  getOrders,
  getDeliveryOrders,
};
