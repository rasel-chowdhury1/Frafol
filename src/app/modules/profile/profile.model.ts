import { model, Schema } from "mongoose";
import { IProfile } from "./profile.interface";

const ProfileSchema = new Schema<IProfile>(
  {
    about: {
      type: String,
      default: ""
    }, 
    
    acceptTerms: {
      type: Boolean,
      default: false
    },
    ramcuvaAgree: {
      type: Boolean,
      default: false
    },
    bankName: {
      type: String,
      default: ""   
  },
  accountNumber: {
      type: String,
      default: ""   
  },
},
  {
    timestamps: true,
  }
);

const Profile = model<IProfile>("Profile", ProfileSchema);
export default Profile;
