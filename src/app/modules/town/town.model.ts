import { Schema, model } from "mongoose";
import { ITown, TownModel } from "./town.interface";

const townSchema = new Schema<ITown>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// filter deleted
townSchema.pre("find", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

townSchema.pre("findOne", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Town = model<ITown, TownModel>("Town", townSchema);
