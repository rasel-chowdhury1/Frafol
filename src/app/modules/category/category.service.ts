import { CategoryType, ICategory } from "./category.interface";
import { Category } from "./category.model";


const createCategory = async (payload: ICategory) => {
  return await Category.create(payload);
};

const getAllCategories = async () => {
  return await Category.find({ isDeleted: false });
};

const getSpecificCategories = async (type: CategoryType) => {
  return await Category.find({type, isDeleted: false });
};

const getCategoryById = async (id: string) => {
  return await Category.findOne({ _id: id, isDeleted: false });
};

const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  return await Category.findByIdAndUpdate(id, payload, { new: true });
};

const deleteCategory = async (id: string) => {
  return await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSpecificCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
