import { Workshop } from "./workshop.model";
import { IWorkshop, IUpdateWorkshop } from "./workshop.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFile } from "../../utils/fileHelper";

const createWorkshop = async (payload: IWorkshop) => {
  return await Workshop.create(payload);
};

const getAllWorkshops = async (query: Record<string, any> = {}) => {
  const workshopQuery = new QueryBuilder(
    Workshop.find({ isDeleted: false }).populate({
      path: "authorId",
      select: "name sureName role profileImage",
    }),
    query
  )
    .search(["title", "description", "location"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await workshopQuery.modelQuery;
  const meta = await workshopQuery.countTotal();

  return { meta, result };
};

const getWorkshopById = async (id: string) => {
  return await Workshop.findOne({ _id: id, isDeleted: false }).populate({
    path: "authorId",
    select: "name sureName role profileImage",
  });
};

const getMyWorkshops = async (userId: string, query: Record<string, unknown>) => {
  const gearQuery = new QueryBuilder(
    Workshop.find({ authorId:userId,isDeleted: false })
      .populate({path: "authorId", select: "name sureName" }),
    query
  )
    .search(["name", "description"]) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await gearQuery.modelQuery;
  const meta = await gearQuery.countTotal();

  return { meta, result };
};

const getPendingWorkshops = async (
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    approvalStatus: "pending",
    isDeleted: false
  };

  const userQuery = new QueryBuilder(Workshop.find(roleFilter), query)
    .search(['title', 'description']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};



const updateWorkshop = async (
  id: string,
  userId: string,
  payload: IUpdateWorkshop
) => {
  // ✅ Case 1: If new image provided → fetch old workshop first
  if (payload.image) {
    const existing = await Workshop.findOne({
      _id: id,
      authorId: userId,
      isDeleted: false,
    });

    if (!existing) {
      throw new Error("Workshop not found or you don't have permission");
    }

    if (existing.image) {
      deleteFile(existing.image);
    }
  }

  // ✅ Case 2: If no new image → directly update
  return Workshop.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    payload,
    { new: true }
  );
};

const updateApprovalStatusByAdmin = async (id: string, status: string) => {
  return await Workshop.findOneAndUpdate(
    { _id: id, isDeleted: false }, // only author can delete
    { approvalStatus: status },
    { new: true }
  );
};

const deleteWorkshop = async (id: string, userId: string) => {
  return await Workshop.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
};

export const WorkshopService = {
  createWorkshop,
  getAllWorkshops,
  getWorkshopById,
  getMyWorkshops,
  getPendingWorkshops,
  updateWorkshop,
  updateApprovalStatusByAdmin,
  deleteWorkshop,
};
