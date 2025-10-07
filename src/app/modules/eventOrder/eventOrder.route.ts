import { Router } from "express";
import auth from "../../middleware/auth";
import { EventOrderController } from "./eventOrder.controller";
import { USER_ROLE } from "../user/user.constants";



const router = Router();


router.post(
    "/create", 
    auth(USER_ROLE.USER), 
    EventOrderController.createEventOrder
)
.get(
    "/", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    EventOrderController.getAllEventOrders
)
.get(
    "/:id", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    EventOrderController.getEventOrderById
)
.patch(
    "/:id/status", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    EventOrderController.updateEventOrderStatus
)
.post(
    "/:id/extension", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    EventOrderController.requestExtension
)
.delete(
    "/:id", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    EventOrderController.deleteEventOrder
);


export const EventOrderRoutes = router;
