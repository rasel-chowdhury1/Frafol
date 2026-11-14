import { Model } from "mongoose";
import { USER_ROLE } from "./user.constants";

// Event orders store their state in `status`, gear orders in `orderStatus`
export const ORDER_STATUS_CONFIG = {
  event: {
    field: "$status",
    // Not counted in the total (not a confirmed order yet)
    excluded: ["pending", "declined"],
    active: [
      "accepted",
      "inProgress",
      "deliveryRequest",
      "deliveryRequestDeclined",
      "cancelRequest",
      "cancelRequestDeclined",
    ],
  },
  gear: {
    field: "$orderStatus",
    // Not counted in the total (unpaid / not confirmed yet)
    excluded: ["pending", "declined"],
    active: ["inProgress", "deliveryRequest", "deliveryRequestDeclined"],
  },
} as const;

export const aggregateOrders = async (
  model: Model<any>,
  type: keyof typeof ORDER_STATUS_CONFIG,
) => {
  const { field, active, excluded } = ORDER_STATUS_CONFIG[type];

  const stats = await model.aggregate([
    // Deleted orders must not be counted
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: { $cond: [{ $in: [field, excluded] }, 0, 1] } },
        completed: { $sum: { $cond: [{ $eq: [field, "delivered"] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: [field, active] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: [field, "cancelled"] }, 1, 0] } },
      },
    },
  ]);

  return stats[0] || { total: 0, completed: 0, active: 0, cancelled: 0 };
};


export const getUserType = (role: string): "client" | "professional" => {
  return role === USER_ROLE.USER || role === USER_ROLE.COMPANY
    ? "client"
    : "professional";
};