import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CategoryService } from "./category.service";
import sendResponse from "../../utils/sendResponse";
import { deleteFileFromS3, uploadFileToS3 } from "../../helpers/s3FileHelper";
import { CategoryType, IUpdateCategory } from "./category.interface";
import { Category } from "./category.model";


const createCategory = catchAsync(async (req: Request, res: Response) => {

  if (req?.file) {
      req.body.image = await uploadFileToS3(req.file, 'category');
    }

  req.body.createdBy = req.user.userId;
  const result = await CategoryService.createCategory(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Category created successfully",
    data: result,
  });

});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategories();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});


const getSpecificCategories = catchAsync(async (req: Request, res: Response) => {

  const {type} = req.params as {type: CategoryType};
  const result = await CategoryService.getSpecificCategories(type);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Specific categories retrieved successfully",
    data: result,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategoryById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {

  const payload: IUpdateCategory = req.body;
  let oldImageKey: string | undefined;

  if (req?.file) {
    // Retrieve the current category to know which image to remove afterward
    const currentCategory = await Category.findById(req.params.id);
    oldImageKey = currentCategory?.image;

    payload.image = await uploadFileToS3(req.file, 'category');
  }

  const result = await CategoryService.updateCategory(req.params.id, payload);

  // Only remove the old S3 object once the new one is uploaded and saved
  if (oldImageKey) {
    deleteFileFromS3(oldImageKey).catch((err) =>
      console.error('Failed to delete old category image from S3:', err),
    );
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.deleteCategory(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category deleted successfully",
    data: null,
  });
});

const reorderCategoriesController = async (req: Request, res: Response) => {
  const { categories } = req.body;

  await CategoryService.reorderCategories(categories);

  res.status(200).json({
    success: true,
    message: "Category order updated successfully",
  });
};

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSpecificCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategoriesController
};
