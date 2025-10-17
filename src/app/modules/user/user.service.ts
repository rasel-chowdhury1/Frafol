/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { DeleteAccountPayload, PaginateQuery, TUser, TUserCreate, VerifiedProfessionalPayload } from './user.interface';
import { User } from './user.models';
import config from '../../config';
import QueryBuilder from '../../builder/QueryBuilder';
import { otpServices } from '../otp/otp.service';
import { generateOptAndExpireTime } from '../otp/otp.utils';
import { TPurposeType } from '../otp/otp.interface';
import { otpSendEmail } from '../../utils/eamilNotifiacation';
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
  
  console.log("before create user => >> ",{payload});
  
  const { name,sureName,companyName, email, password, role,photographerSpecializations,videographerSpecializations, about, hourlyRate,address,town,country,acceptTerms,ramcuvaAgree,newsLetterSub,ico,dic,ic_dph} =
    payload;
  let adminVerified = "pending"
  if (role === "user" || role === "company"){
     adminVerified = "verified"
  }

  // user exist check
  const userExist = await userService.getUserByEmail(email);

  if (userExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exist!!');
  }

  const { isExist, isExpireOtp } = await otpServices.checkOtpByEmail(email, "email-verification");

  const { otp, expiredAt } = generateOptAndExpireTime();

  let otpPurpose: TPurposeType = 'email-verification';

  if (isExist && !isExpireOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'otp-exist. Check your email.');
  } else if (isExist && isExpireOtp) {
    const otpUpdateData = {
      otp,
      expiredAt,
    };

    await otpServices.updateOtpByEmail(email,otpPurpose, otpUpdateData);
  } else if (!isExist) {
    await otpServices.createOtp({
      name: "Customer",
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
    ic_dph
  };


  // send email
  process.nextTick(async () => {
    await otpSendEmail({
      sentTo: email,
      subject: 'Your one time otp for email  verification',
      name: "Customer",
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
              throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
            }

            const decodeData = verifyToken({
              token,
              access_secret: config.jwt_access_secret as string,
            });

            if (!decodeData) {
              throw new AppError(httpStatus.BAD_REQUEST, "You are not authorised");
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
              ic_dph
            } = decodeData;

            // Check OTP
            const isOtpMatch = await otpServices.otpMatch(
              email,
              "email-verification",
              otp
            );
            if (!isOtpMatch) {
              throw new AppError(httpStatus.BAD_REQUEST, "OTP did not match");
            }

            // Update OTP status
            await otpServices.updateOtpByEmail(email, "email-verification", {
              status: "verified",
            });

            // Check if user exists
            const isExist = await User.isUserExist(email as string);
            if (isExist) {
              throw new AppError(
                httpStatus.FORBIDDEN,
                "User already exists with this email"
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
                    address,
                    town,
                    country,
                    photographerSpecializations,
                    videographerSpecializations,
                    minHourlyRate,
                    maxHourlyRate,
                    acceptTerms,
                    newsLetterSub,
                    adminVerified,
                    ico,
                    dic,
                    ic_dph
                  },
                ],
                { session }
              );

              const profileData: IProfile = {
                about,
                acceptTerms,
                ramcuvaAgree
              };
              const profile = await Profile.create([profileData], { session });

              // Link profile to user
              await User.findByIdAndUpdate(
                user[0]._id,
                { profileId: profile[0]._id },
                { new: true, session }
              );

              await session.commitTransaction();
              session.endSession();


              const notificationData = {
                userId: user[0]._id,
                receiverId: getAdminId(),
                userMsg: {
                  fullName: user[0].name || "",
                  image: user[0].profileImage || "", // Placeholder image URL (adjust this)
                  text: "New user added in your app"
                },
                type: 'added',
              } as any;

              // emit notification in background, don’t block response
              emitNotification(notificationData).catch(err => {
                console.error("Notification emit failed:", err);
              });
              // Generate access token
              const jwtPayload = {
                userId: user[0]._id.toString(),
                name: user[0].name || "",
                sureName: user[0].sureName,
                companyName: user[0].companyName || "",
                email: user[0].email,
                role: user[0].role,
              };

              return createToken({
                payload: jwtPayload,
                access_secret: config.jwt_access_secret as string,
                expity_time: "5m",
              });
            } catch (error) {
              await session.abortTransaction();
              session.endSession();
              throw new AppError(httpStatus.BAD_REQUEST, "User creation failed");
            }
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
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  // 2️⃣ Handle profile fields
  if (about || bankName || accountNumber || routingNumber) {
    let profile;
    if (user.profileId) {
      profile = await Profile.findByIdAndUpdate(
        user.profileId,
        { about, bankName, accountNumber, routingNumber },
        { new: true }
      );
    } else {
      profile = await Profile.create({ about, bankName, accountNumber, routingNumber });
      (user.profileId as any)= profile._id; // Keep as ObjectId
      await user.save();
    }
  }

  // Delete previous profile image if a new one is uploaded
  if (payload.profileImage && user.profileImage) {
    const oldFilePath = path.join(process.cwd(), "public", user.profileImage); // include public folder
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
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

  if (!updatedUser) {
    throw new AppError(httpStatus.BAD_REQUEST, "User updating failed");
  }

  return updatedUser;
};

const updateGallery = async (
  userId: string,
  updateData: { gallery?: string[]; deleteGallery?: string[] }
) => {
  console.log("updateData ->>> ", { ...updateData });

  // Fetch the current business first
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new Error("User not found");
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
    newGallery = newGallery.filter(img => !updateData.deleteGallery?.includes(img));
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
    { new: true }
  );

  return updatedBusiness;
};

const verifyProfessionalUserById = async (userId: string, status?: string) => {


  const user = await User.findByIdAndUpdate(
    userId,
    { adminVerified: status ? status : "verified" },
    { new: true, runValidators: true } // ensure validation runs
  ).select('-password'); // exclude password

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User verification update failed');
  }

  return user;
};

const declineProfessionalUserById = async (userId: string, reason?: string) => {
  // Soft delete + mark as declined
  const user = await User.findByIdAndUpdate(
    userId,
    { 
      isDeleted: true, 
      adminVerified: 'declined' // optional, could use 'declined' if you add this enum
    },
    { new: true, runValidators: true }
  ).select('-password'); // exclude password

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the professional user');
  }

  return user;
};

const updateUnAvailability = async (userId: string, dates: string[]) => {
  // Find the user
  const user = await User.findById(userId) as any;
  if (!user) throw new Error("User not found");

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

const getProfessionalPhotographerAndVideographer = async (query: Record<string, unknown>) => {
  const { role,...rest } = query;

  console.log("role==>>> ", role)
  console.log("query==>>> ", rest)

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

  console.log({ baseCondition });

  // ✅ Initialize QueryBuilder
  const userQuery = new QueryBuilder(User.find(baseCondition), rest)
    .search(["name", "sureName", "town", "country"])
    .filter()
    .sort()
    .paginate()
    .fields();

  // ✅ Fetch results (sorted by rating by default)
  const result = await userQuery.modelQuery
    .sort({ averageRating: -1 })
    .select("name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview");

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

const getProfessionalUsersByCategory = async (query: Record<string, unknown>) => {
  console.log("query data=>>. ", query)
  const { role, categoryType, ...rest } = query;

  // Determine roles to filter
  const roles = role
    ? [role, USER_ROLE.BOTH]
    : [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH];

    console.log({roles})

  // Base query
  let baseFilter: any = {
    role: { $in: roles },
    isDeleted: false,
    isBlocked: false,
  };

  console.log("cateogory type==>>> ", categoryType)
  // Apply categoryType filter depending on role
  if (categoryType) {

    
    const regex = new RegExp(categoryType as string, "i");

    console.log({regex})

    if (role === USER_ROLE.PHOTOGRAPHER) {
      baseFilter.photographerSpecializations = { $elemMatch: { $regex: regex } };
    } else if (role === USER_ROLE.VIDEOGRAPHER) {
      baseFilter.videographerSpecializations = { $elemMatch: { $regex: regex } };
    } else if (role === USER_ROLE.BOTH) {
      baseFilter.$or = [
        { photographerSpecializations: { $elemMatch: { $regex: regex } } },
        { videographerSpecializations: { $elemMatch: { $regex: regex } } },
      ];
    }
  }



  // Build initial query
  let baseQuery = User.find(baseFilter).select(
    "name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview photographerSpecializations videographerSpecializations"
  );

    console.log({ baseFilter,baseQuery,query });

  // Use QueryBuilder
  const userQuery = new QueryBuilder(baseQuery, rest)
    .search(["name", "sureName"]) // searchable fields
    .filter() // other filters
    .sort()
    .paginate()
    .fields();

  // Execute query
  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};




  const getProfessionalVideographers= async (query: PaginateQuery) => {
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
      .select("name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview ");

    const totalPage = Math.ceil(total / limit);

    return {
      meta: { page, limit, total, totalPage },
      result,
    };
  };


  const getProfessionalPhotographers= async (query: PaginateQuery) => {
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
      .select("name sureName role profileImage town address country minHourlyRate maxHourlyRate averageRating totalReview ");

    const totalPage = Math.ceil(total / limit);

    return {
      meta: { page, limit, total, totalPage },
      result,
    };
  };

const getAllUserQuery = async (userId: string, query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find({ _id: { $ne: userId } }), query)
    .search(['fullName'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { meta, result };
};

const getAllPhotographersVideographersBoth = async (
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    role: { $in: [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH] },
    adminVerified: "verified",
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
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    role: { $in: [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH] },
    adminVerified: "pending",
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

const getAllUserCount = async () => {
  const allUserCount = await User.countDocuments();
  return allUserCount;
};


const getUserRoleStats = async () => {
  const result = await User.aggregate([
    {
      $match: { adminVerified: "verified", isDeleted: false }
    },
    {
      $group: {
        _id: null,
        totalPhotographer: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.PHOTOGRAPHER] }, 1, 0] }
        },
        totalVideographer: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.VIDEOGRAPHER] }, 1, 0] }
        },
        totalBoth: {
          $sum: { $cond: [{ $eq: ['$role', USER_ROLE.BOTH] }, 1, 0] }
        },
        totalUserCompany: {
          $sum: {
            $cond: [{ $in: ['$role', [USER_ROLE.USER, USER_ROLE.COMPANY]] }, 1, 0]
          }
        }
      }
    }
  ]);

  return result[0] || {
    totalPhotographer: 0,
    totalVideographer: 0,
    totalBoth: 0,
    totalUserCompany: 0,
  };
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
  const user = await User.findOne({ _id: userId, isDeleted: false, isBlocked: false })
    .select("name sureName profileImage role minHourlyRate maxHourlyRate address totalReview averageRating gallery profileId")
    .populate({
      path: "profileId",
      select: "about",
      model: "Profile",
    });

  // ✅ Handle user not found
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // 3️⃣ Fetch user's package and review stats
  const packageAndReviewStats = await getUserPackageAndReviewStats(userId);


  return {    ...user.toObject(),
     starCounts: packageAndReviewStats.starCounts, package:packageAndReviewStats.packages};
};




// Optimized the function to improve performance, reducing the processing time to 235 milliseconds.
const getMyProfile = async (id: string) => {
const result = await User.findById(id).populate("profileId")
return result;
};



const getAdminProfile = async (id: string) => {
  const result = await User.findById(id).lean()

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }


  return result;
};

const getUserByEmail = async (email: string) => {
  const result = await User.findOne({ email });

  return result;
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

  return {status, user};
};

export const userService = {
  createUserToken,
  otpVerifyAndCreateUser,
  getMyProfile,
  getAdminProfile,
  getUserById,
  getUserDetailsById,
  getUserGalleryById,
  getUserByEmail,
  updateUser,
  updateGallery,
  updateUnAvailability,
  verifyProfessionalUserById,
  declineProfessionalUserById,
  deleteMyAccount,
  blockedUser,
  getAllUserQuery,
  getAllUserCount,
  getUserRoleStats,
  getAllPhotographersVideographersBoth,
  getPendingPhotographersVideographersBoth,
  getProfessionalPhotographerAndVideographer,
  getProfessionalUsersByCategory
};
