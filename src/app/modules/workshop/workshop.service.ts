import { Workshop } from "./workshop.model";
import { IWorkshop, IUpdateWorkshop } from "./workshop.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFile } from "../../utils/fileHelper";
import AppError from "../../error/AppError";
import { WorkshopParticipant } from "../workshopParticipant/workshopParticipant.model";

const createWorkshop = async (payload: IWorkshop) => {
  // ✅ Keep vatPercent as percentage (e.g., 15 for 15%)
  payload.vatPercent = payload.vatAmount as number;

  // ✅ Calculate actual VAT amount based on main price
  payload.vatAmount = (payload.mainPrice * payload.vatPercent) / 100;

  return await Workshop.create(payload);
};


const getAllWorkshops = async (query: Record<string, any> = {}) => {
  const workshopQuery = new QueryBuilder(
    Workshop.find({ isDeleted: false, approvalStatus: "approved" }).populate({
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

  const workshops = await workshopQuery.modelQuery;
  const meta = await workshopQuery.countTotal();

    // ✅ Add total participants count for each workshop
  const result = await Promise.all(
    workshops.map(async (workshop: any) => {
      const totalParticipants = await WorkshopParticipant.countDocuments({
        workshopId: workshop._id,
        isDeleted: false,
      });

      return {
        ...workshop.toObject(),
        totalParticipants,
      };
    })
  );

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
      .populate({path: "authorId", select: "name sureName role profileImage" }),
    query
  )
    .search(["name", "description"]) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const workshops = await gearQuery.modelQuery;
  const meta = await gearQuery.countTotal();

      // ✅ Add total participants count for each workshop
  const result = await Promise.all(
    workshops.map(async (workshop: any) => {
      const totalParticipants = await WorkshopParticipant.countDocuments({
        workshopId: workshop._id,
        isDeleted: false,
      });

      return {
        ...workshop.toObject(),
        totalParticipants,
      };
    })
  );

  return { meta, result };
};

const getMyRegisteredWorkshops = async (userId: string, query: Record<string, unknown>) => {
  const workshopQuery = new QueryBuilder(
    WorkshopParticipant.find({ clientId: userId, isDeleted: false })
      .populate({
        path: "workshopId",
        populate: {
          path: "authorId",
          select: "name sureName role profileImage",
        },
      }),
    query
  )
    .search(["workshopId.title", "workshopId.description", "workshopId.location"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const participants = await workshopQuery.modelQuery;
  const meta = await workshopQuery.countTotal();

  // ✅ Format response to include direct workshop info
  const result = participants.map((p: any) => ({
    ...p.toObject(),
    workshop: p.workshopId,
  }));

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

  const userQuery = new QueryBuilder(Workshop.find(roleFilter)
                                              .populate({path: "authorId", select: "name sureName role profileImage" }), query)
    .search(['title', 'description']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};


const getParticipantsByWorkshop = async (workshopId: string) => {

  const participants = await WorkshopParticipant.find({workshopId,isDeleted: false})
                                                .populate('clientId', 'name email profileImage')

  return participants || [];

}


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

const declineWorkshopById = async (id: string, reason: string) => {
  const workshop = await Workshop.findOneAndUpdate(
    { _id: id }, // ✅ must pass filter object
    { 
      isDeleted: true,
      approvalStatus: 'cancelled', // or 'declined' if you add it to enum
      declineReason: reason        // ✅ store reason if your schema supports it
    },
    { new: true, runValidators: true }
  );

  if (!workshop) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the workshop or workshop not found');
  }

  return workshop;
};

const deleteWorkshop = async (id: string, userId: string, role: string) => {
  const filter: any = { _id: id, isDeleted: false };

  if (role !== "admin") {
    filter.authorId = userId; // only add this check for normal users
  }

  return await Workshop.findOneAndUpdate(
    filter,
    { isDeleted: true },
    { new: true }
  );
};

export const WorkshopService = {
  createWorkshop,
  getAllWorkshops,
  getWorkshopById,
  getMyWorkshops,
  getMyRegisteredWorkshops,
  getPendingWorkshops,
  getParticipantsByWorkshop,
  updateWorkshop,
  updateApprovalStatusByAdmin,
  declineWorkshopById,
  deleteWorkshop,
};
