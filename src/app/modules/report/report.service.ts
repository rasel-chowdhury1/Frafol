import { Report } from "./report.model";
import { IReport, IUpdateReport } from "./report.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { resolveFileUrl } from "../../helpers/s3FileHelper";

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

  const result = await reportQuery.modelQuery.lean();
  const meta = await reportQuery.countTotal();

  const resolved = await Promise.all(
    result.map(async (r: any) => ({ ...r, image: await resolveFileUrl(r.image) })),
  );

  return { meta, result: resolved };
};

const getReportById = async (id: string) => {
  const report = await Report.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "userId",
      select: "name sureName role switchRole profileImage",
    })
    .lean();

  if (!report) return report;

  return { ...report, image: await resolveFileUrl((report as any).image) };
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
