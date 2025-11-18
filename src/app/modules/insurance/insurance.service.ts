import { Insurance } from "./insurance.model";
import QueryBuilder from "../../builder/QueryBuilder";

// USER — submit form
const applyForInsurance = async (userId: string, payload: any) => {
  const data = await Insurance.create({
    ...payload,
    userId,
  });

  return data;
};

// ADMIN — get all insurance applications
const getAllInsuranceApplications = async (query: any) => {
  const insuranceQuery = new QueryBuilder(
    Insurance.find().populate("userId", "name email profileImage"),
    query
  )
    .search(["fullName", "companyName", "email"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const applications = await insuranceQuery.modelQuery;
  const meta = await insuranceQuery.countTotal();

  return { meta, applications };
};

// USER — get his own applications
const getMyInsuranceApplications = async (userId: string, query: any) => {
  const insuranceQuery = new QueryBuilder(
    Insurance.find({ userId }),
    query
  )
    .search(["fullName", "companyName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const applications = await insuranceQuery.modelQuery;
  const meta = await insuranceQuery.countTotal();

  return { meta, applications };
};

export const InsuranceService = {
  applyForInsurance,
  getAllInsuranceApplications,
  getMyInsuranceApplications,
};
