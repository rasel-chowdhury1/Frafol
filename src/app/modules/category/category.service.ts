import { CategoryType, ICategory } from "./category.interface";
import { Category } from "./category.model";
import { resolveFileUrl } from "../../helpers/s3FileHelper";


const createCategory = async (payload: ICategory) => {
  // find max order for same type
  const lastCategory = await Category
    .findOne({ type: payload.type, isDeleted: false })
    .sort({ order: -1 })
    .select("order");

  const nextOrder = lastCategory ? lastCategory.order + 1 : 1;

  return await Category.create({
    ...payload,
    order: nextOrder,
  });
};

const getAllCategories = async () => {
  const categories = await Category.find({ isDeleted: false }).lean();
  return Promise.all(
    categories.map(async (c: any) => ({ ...c, image: await resolveFileUrl(c.image) })),
  );
};

const getSpecificCategories = async (type: CategoryType) => {
  const categories = await Category.find({ type, isDeleted: false }).sort({ order: 1 }).lean();
  return Promise.all(
    categories.map(async (c: any) => ({ ...c, image: await resolveFileUrl(c.image) })),
  );
};

const getCategoryById = async (id: string) => {
  const category = await Category.findOne({ _id: id, isDeleted: false }).lean();
  if (!category) return category;
  return { ...category, image: await resolveFileUrl((category as any).image) };
};

const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  return await Category.findByIdAndUpdate(id, payload, { new: true });
};

const deleteCategory = async (id: string) => {
  return await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
};

const reorderCategories = async (
  categories: { _id: string; order: number }[]
) => {
  const bulkOps = categories.map(cat => ({
    updateOne: {
      filter: { _id: cat._id },
      update: { order: cat.order },
    },
  }));

  await Category.bulkWrite(bulkOps);
  return true;
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSpecificCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategories
};
