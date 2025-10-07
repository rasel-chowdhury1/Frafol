
import mongoose from "mongoose";
import { EventOrder } from "./eventOrder.model";
import { IEventOrder } from "./eventOrder.interface";
import QueryBuilder from "../../builder/QueryBuilder";

const createEventOrder = async (payload: IEventOrder) => {
    
  console.log("Creating EventOrder with payload:", payload);
  const result = await EventOrder.create(payload);
  return result;
};

const getEventOrders = async (query: Record<string, unknown>) => {
  const eventOrderQuery = new QueryBuilder(EventOrder.find({ isDeleted: false }), query)
    .filter() // apply filters (userId, serviceProviderId, orderType, etc.)
    .search(["orderId", "location", "town", "country"]) // allow searching by these fields
    .sort()
    .paginate()
    .fields();

  const result = await eventOrderQuery.modelQuery
    .populate("userId", "name sureName")
    .populate("serviceProviderId", "name sureName")
    .exec();

  const meta = await eventOrderQuery.countTotal();

  return { meta, result };
};

const getEventOrderById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid EventOrder ID");
  }

  const result = await EventOrder.findById(id)
    .populate("userId", "name sureName")
    .populate("serviceProviderId", "name sureName");

  if (!result) {
    throw new Error("EventOrder not found");
  }

  return result;
};

const updateEventOrderStatus = async (id: string, status: string) => {
  if (!["pending", "accepted", "inProgress", "delivered", "cancelled"].includes(status)) {
    throw new Error("Invalid status value");
  }

  const result = await EventOrder.findByIdAndUpdate(
    id,
    { $push: { status } },
    { new: true }
  );

  if (!result) throw new Error("EventOrder not found");
  return result;
};

const requestExtension = async (
  orderId: string,
  requestedBy: string,
  newDeliveryDate: Date,
  reason: string
) => {
  const result = await EventOrder.findByIdAndUpdate(
    orderId,
    {
      $push: {
        extensionRequests: { requestedBy, newDeliveryDate, reason, approved: false },
      },
    },
    { new: true }
  );

  if (!result) throw new Error("EventOrder not found");
  return result;
};

const deleteEventOrder = async (id: string) => {
  const result = await EventOrder.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!result) throw new Error("EventOrder not found");
  return result;
};

export const EventOrderService = {
  createEventOrder,
  getEventOrders,
  getEventOrderById,
  updateEventOrderStatus,
  requestExtension,
  deleteEventOrder,
};
