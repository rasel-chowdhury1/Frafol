import { Schema, model } from "mongoose";
import { IEventOrder, IEventOrderModel } from "./eventOrder.interface";

// =========================
// 📦 Extension Request Subdocument
// =========================
const ExtensionRequestSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    newDeliveryDate: { type: Date, required: true },
    reason: { type: String, required: true },
    approved: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

// =========================
// 🕒 Status Timestamps Subdocument
// =========================
const StatusTimestampsSchema = new Schema(
  {
    createdAt: { type: Date },
    declinedAt: { type: Date },
    acceptedAt: { type: Date },
    inProgressAt: { type: Date },
    deliveryRequestAt: { type: Date },
    deliveryRequestDeclineAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { _id: false }
);

// =========================
// 🧾 Event Order Schema
// =========================
const EventOrderSchema = new Schema<IEventOrder>(
  {
    orderId: { type: String, required: true, unique: true },

    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serviceProviderId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    orderType: {
      type: String,
      enum: ["direct", "custom"],
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["photography", "videography"],
      required: true,
    },

    date: { type: Date, required: true },
    location: { type: String },
    time: { type: String },

    price: { type: Number },
    priceWithServiceFee: {type: Number},
    vatAmount: { type: Number, default: 0 },
    totalPrice: { type: Number },

    packageId: { type: Schema.Types.ObjectId, ref: "Package" },
    deliveryDate: { type: Date },
    lastDeliveryDate: { type: Date },

    budget_range: { type: String },
    duration: { type: String },
    streetAddress: { type: String },
    town: { type: String },
    country: { type: String },

    // ✅ Company Info (for custom orders)
    isRegisterAsCompany: { type: Boolean, default: false },
    companyName: { type: String },
    ICO: { type: String },
    DIC: { type: String },
    IC_DPH: { type: String },
    name: { type: String },
    sureName: { type: String },

    // ✅ Order Status
    status: {
      type: String,
      enum: ["pending", "declined", "accepted", "inProgress", "deliveryRequest","deliveryRequestDeclined", "delivered", "cancelled"],
      default: "pending",
    },

    // ✅ Reason fields
    declineReason: { type: String, trim: true },
    deliveryRequestDeclinedReason: {
      type: String,
      trim: true
    },
    cancelReason: { type: String, trim: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },

    // ✅ Status Timestamps
    statusTimestamps: {
      type: StatusTimestampsSchema,
      default: () => ({ createdAt: new Date() }),
    },

    // ✅ Optional status change history for audit tracking
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: ["pending", "declined", "accepted", "inProgress", "deliveryRequest", "deliveryRequestDeclined", "delivered", "cancelled"],
            required: true,
          },
          reason: { type: String },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // ✅ Extension Requests
    extensionRequests: { type: [ExtensionRequestSchema], default: [] },

    description: { type: String },
    paymentStatus: {
       type: String,
       default: "Unpaid"
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

// =========================
// ⚙️ Pre-Save Hook
// =========================
EventOrderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const now = new Date();

    // ✅ Prevent overwriting old timestamps
    switch (this.status) {
      case "accepted":
        if (!this.statusTimestamps.acceptedAt)
          this.statusTimestamps.acceptedAt = now;
        break;

      case "declined":
        if (!this.statusTimestamps.acceptedAt)
          this.statusTimestamps.acceptedAt = now;
        break;
      
      case "inProgress":
        if (!this.statusTimestamps.inProgressAt)
          this.statusTimestamps.inProgressAt = now;
        break;
      case "deliveryRequest":
        if (!this.statusTimestamps.deliveredAt)
          this.statusTimestamps.deliveryRequestAt = now;
        break;
      case "deliveryRequestDeclined":
        if (!this.statusTimestamps.deliveredAt)
          this.statusTimestamps.deliveryRequestDeclineAt = now;
        break;
      case "delivered":
        if (!this.statusTimestamps.deliveredAt)
          this.statusTimestamps.deliveredAt = now;
        break;
      case "declined":
        if (!this.statusTimestamps.declinedAt)
          this.statusTimestamps.declinedAt = now;
        break;
      case "cancelled":
        if (!this.statusTimestamps.cancelledAt)
          this.statusTimestamps.cancelledAt = now;
        break;
    }

    // ✅ Add reason if applicable
    const reason =
      this.status === "declined"
        ? this.declineReason
        : this.status === "cancelled"
        ? this.cancelReason
        : undefined;

    // ✅ Push to history log
    this.statusHistory.push({
      status: this.status,
      changedAt: now,
    });
  }

  next();
});

// =========================
// ✅ Export Model
// =========================
export const EventOrder = model<IEventOrder, IEventOrderModel>(
  "EventOrder",
  EventOrderSchema
);
