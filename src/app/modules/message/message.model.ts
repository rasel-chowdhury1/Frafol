import { Schema, model } from 'mongoose';
import { IMessage } from './message.interface';
import { hasForbiddenContent } from '../community/community.utils';

const MessageSchema = new Schema<IMessage>(
  {
    text: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    readBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User', // Reference to User model
      default: [], // Initialize as an empty array
    },
    seen: {
      type: Boolean,
      default: false,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  },
);

// 🛡️ Automatically set approvalStatus before saving
MessageSchema.pre("save", function (next) {
  if (this.text && hasForbiddenContent(this.text)) {
    this.approvalStatus = "pending";
  } else {
    this.approvalStatus = "approved";
  }
  next();
});

const Message = model<IMessage>('Message', MessageSchema);

export default Message;
