import express from "express";
import { townController } from "./town.controller";


const router = express.Router();

router
    .post("/create", 
        townController.createTown)
    .get("/", 
        townController.getAllTowns)
    .get("/:id", 
        townController.getTownById)
    .patch("/:id", 
        townController.updateTown)
    .delete("/:id", 
        townController.deleteTown);

export const TownRoutes = router;
