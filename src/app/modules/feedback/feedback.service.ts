import { Feedback } from "./feedback.model";
import { IFeedback, IUpdateFeedback } from "./feedback.interface";
import QueryBuilder from "../../builder/QueryBuilder";

const createFeedback = async (payload: IFeedback) => {
  return await Feedback.create(payload);
};

const getAllFeedbacks = async (query: Record<string, any> = {}) => {


  const userQuery = new QueryBuilder(Feedback.find({ isDeleted: false }).populate({
      path: "userId",
      select: "name sureName role switchRole profileImage", // fields to select from User
    }), query)
    .search(['text']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getFeedbackById = async (id: string) => {
  return await Feedback.findOne({ _id: id, isDeleted: false }).populate({
                          path: "userId",
                          select: "name sureName role switchRole profileImage", // fields to select from User
                        });;
};

const updateFeedback = async (id: string, userId: string, payload: IUpdateFeedback) => {
  return await Feedback.findOneAndUpdate(
    { _id: id, userId, isDeleted: false }, // self-only update
    payload,
    { new: true }
  );
};

const deleteFeedback = async (id: string, userId: string) => {
  return await Feedback.findOneAndUpdate(
    { _id: id, userId, isDeleted: false }, // self-only delete
    { isDeleted: true },
    { new: true }
  );
};

export const FeedbackService = {
  createFeedback,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
};
