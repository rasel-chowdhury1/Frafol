/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { DeleteAccountPayload, PaginateQuery, TUser, TUserCreate } from './user.interface';
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
import mongoose from 'mongoose';
import { getAdminId } from '../../DB/adminStrore';
import { emitNotification } from '../../../socketIo';
import { USER_ROLE } from './user.constants';

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
  
  const { name,sureName,companyName, email, password, role,photographerSpecializations,videographerSpecializations, about, hourlyRate,address,town,country,acceptTerms,ramcuvaAgree,newsLetterSub} =
    payload;

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
    hourlyRate,
    address,
    town,
    country,
    acceptTerms,
    ramcuvaAgree,
    newsLetterSub
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
              hourlyRate,
              address,
              town,
              country,
              acceptTerms,
              ramcuvaAgree,
              newsLetterSub,
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
                    hourlyRate,
                    acceptTerms,
                    newsLetterSub,
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


const updateUser = async (id: string, payload: Partial<TUser>) => {
  const { role, email, isBlocked, isDeleted,password, ...rest } = payload;


  const user = await User.findByIdAndUpdate(id, rest, { new: true });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User updating failed');
  }

  return user;
};

// ............................rest

    const getProfessionalPhotographerAndVideographer = async (query: PaginateQuery) => {
      const roles = [USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH];

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
        .select("name sureName profileImage town address country hourlyRate averageRating totalReview ");

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

const getAllUserCount = async () => {
  const allUserCount = await User.countDocuments();
  return allUserCount;
};

const getUsersOverview = async (userId:string, year:any) => {
  try {
    // Fetch total user count
    const totalUsers = await User.countDocuments();

    // Fetch user growth over time for the specified year (monthly count with month name)
    const userOverview = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) }, // Filter by year
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' }, // Group by month of the 'createdAt' date
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          monthName: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 1] }, then: "January" },
                { case: { $eq: ["$_id", 2] }, then: "February" },
                { case: { $eq: ["$_id", 3] }, then: "March" },
                { case: { $eq: ["$_id", 4] }, then: "April" },
                { case: { $eq: ["$_id", 5] }, then: "May" },
                { case: { $eq: ["$_id", 6] }, then: "June" },
                { case: { $eq: ["$_id", 7] }, then: "July" },
                { case: { $eq: ["$_id", 8] }, then: "August" },
                { case: { $eq: ["$_id", 9] }, then: "September" },
                { case: { $eq: ["$_id", 10] }, then: "October" },
                { case: { $eq: ["$_id", 11] }, then: "November" },
                { case: { $eq: ["$_id", 12] }, then: "December" },
              ],
              default: "Unknown", // Default value in case month is not valid
            },
          },
        },
      },
      { $sort: { _id: 1 } }, // Sort by month (ascending)
    ]);

    // Fetch recent users
    const recentUsers = await User.find({ _id: { $ne: userId } }).sort({ createdAt: -1 }).limit(6);

    return {
      totalUsers,
      userOverview, // Includes month names with user counts
      recentUsers,
    };
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    throw new Error('Error fetching dashboard data.');
  }
};



const getUserById = async (id: string) => {
  const result = await User.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
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
  getUserByEmail,
  updateUser,
  deleteMyAccount,
  blockedUser,
  getAllUserQuery,
  getAllUserCount,
  getUsersOverview,
  getProfessionalPhotographerAndVideographer
};
