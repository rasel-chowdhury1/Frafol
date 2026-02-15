import { Model } from "mongoose";
import { USER_ROLE } from "./user.constants";

export const aggregateOrders = async (model: Model<any>) => {
  const stats = await model.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        active: {
          $sum: {
            $cond: [
              { $in: ["$status", ["accepted", "inProgress", "deliveryRequest"]] },
              1,
              0,
            ],
          },
        },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
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