import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CategoryService } from "./category.service";
import sendResponse from "../../utils/sendResponse";
import { deleteFile, storeFile } from "../../utils/fileHelper";
import { CategoryType, IUpdateCategory } from "./category.interface";
import { Category } from "./category.model";


const createCategory = catchAsync(async (req: Request, res: Response) => {
  
  if (req?.file) {
      req.body.image = storeFile('category', req?.file?.filename);
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

  if (req?.file) {

    // Retrieve the current category to check if an image exists
    const currentCategory = await Category.findById(req.params.id);

    if (currentCategory?.image) {
      // Delete the old image before updating
      // This function can either delete from a local folder or cloud storage
      deleteFile(currentCategory.image);
    }

      payload.image = storeFile('category', req?.file?.filename);
    }

  const result = await CategoryService.updateCategory(req.params.id, payload);

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
