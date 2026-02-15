import { Router } from "express";
import { CategoryController } from "./category.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";
import fileUpload from "../../middleware/fileUpload";
import parseData from "../../middleware/parseData";
const upload = fileUpload('./public/uploads/category');


const router = Router();

router
     .post(
        "/add", 
        auth(USER_ROLE.ADMIN),
        upload.single('image'),
        parseData(),
        CategoryController.createCategory
    )

     .patch(
        "/update/:id", 
        auth(USER_ROLE.ADMIN),
        upload.single('image'),
        parseData(),
        CategoryController.updateCategory
    )

    .patch(
        "/reorder",
        auth(USER_ROLE.ADMIN),
        CategoryController.reorderCategoriesController
    )

     .get(
        "/", 
        CategoryController.getAllCategories
    )

    .get(
        "/type/:type",
        CategoryController.getSpecificCategories
    )

     .get(
        "/:id",
        CategoryController.getCategoryById
    )


     .delete(
        "/:id", 
        auth(USER_ROLE.ADMIN),
        CategoryController.deleteCategory
    );

export const CategoryRoutes = router;
