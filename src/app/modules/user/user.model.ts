import bcrypt from 'bcrypt';
import { Error, model, Schema } from 'mongoose';
import config from '../../config';
import { TUser, UserModel } from './user.interface';
import { USER_ROLE } from './user.constants';

const userSchema = new Schema<TUser>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null
    },
    name: {
      type: String,
      default: '',
    },
    sureName: {
      type: String,
      default: '',
    },
    companyName: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: [USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY, USER_ROLE.ADMIN],
      default: 'user',
    },
    mainRole: {
      type: String,
      enum: [USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY, USER_ROLE.ADMIN],
      default: 'user',
    },
    switchRole: {
      type: String,
      enum: [USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH,USER_ROLE.COMPANY, USER_ROLE.ADMIN],
      default: 'user',
    },
    thumbnailImage: {
      type: String,
      default: '',
    },
    introVideo: {
      type: String,
      default: '',
    },
    bannerImages: {
      type: [String],
      default: [],
    },
    gallery: {
      type: [String],
      default: [],  
    },
    phone: {
      type: String,
      default: ""
    },
    address: {
      type: String,
      default: ''
    },
    town: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    zipCode: {
       type: String,
       default: ""
    },
    minHourlyRate: {
      type: Number,
      default: 0
    },
    maxHourlyRate: {
      type: Number,
      default: 0
    },
    ico: {
      type: String,
      default: ''
    },
    dic: {
      type: String,
      default: ''
    },
    ic_dph: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      default: 0
    },
    totalReview: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    
    photographerSpecializations: {
      type: [String],
      default: []
    },
    videographerSpecializations: {
      type: [String],
      default: []
    },
    newsLetterSub: {
      type: Boolean, // Added date of birth
      required: false, // Optional field
    },
    adminVerified: {
      type: String,
      enum: ["pending", "verified", 'declined'],
      default: "pending"
    },
    unAvailability: {
      type: [String],
      default: [],
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null
    },
    hasActiveSubscription: {
      type: Boolean,
      default: false,
      index: true,
    },
    subscriptionExpiryDate: {
      type: Date,
      default: null
    },
    subscriptionDays: {
      type: Number,
      default: 0
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

userSchema.pre('save', async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;
  // user.password = await bcrypt.hash(
  //   user.password,
  //   Number(config.bcrypt_salt_rounds),
  // );

  if (user.isModified('password') && user.password) {
    user.password = await bcrypt.hash(
      user.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

// set '' after saving password
userSchema.post(
  'save',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function (error: Error, doc: any, next: (error?: Error) => void): void {
    doc.password = '';
    next();
  },
);

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password; // Remove password field
  return user;
};

// filter out deleted documents
userSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

userSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

userSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

userSchema.statics.isUserExist = async function (email: string) {
  
  return await User.findOne({ email: email }).select('+password');
};

userSchema.statics.isUserActive = async function (email: string) {
  return await User.findOne({
    email: email,
    isBlocked: false,
    isDeleted: false
  }).select('+password');
};

userSchema.statics.IsUserExistById = async function (id: string) {
  return await User.findById(id).select('+password');
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

export const User = model<TUser, UserModel>('User', userSchema);
