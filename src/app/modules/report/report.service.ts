import { Report } from "./report.model";
import { IReport, IUpdateReport } from "./report.interface";
import QueryBuilder from "../../builder/QueryBuilder";

const createReport = async (payload: IReport) => {
  return await Report.create(payload);
};

const getAllReports = async (query: Record<string, any> = {}) => {
  const reportQuery = new QueryBuilder(
    Report.find({ isDeleted: false }).populate({
      path: "userId",
      select: "name sureName role switchRole profileImage",
    }),
    query
  )
    .search(["reason"]) // allow search by reason
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reportQuery.modelQuery;
  const meta = await reportQuery.countTotal();

  return { meta, result };
};

const getReportById = async (id: string) => {
  return await Report.findOne({ _id: id, isDeleted: false }).populate({
    path: "userId",
    select: "name sureName role switchRole profileImage",
  });
};

const updateReport = async (id: string, payload: IUpdateReport) => {

  return await Report.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true }
  );
};

const deleteReport = async (id: string) => {
  return await Report.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
};

export const ReportService = {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  deleteReport,
};
