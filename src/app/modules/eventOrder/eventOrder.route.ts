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

.patch(
    "/custom/accept/:orderId", 
    auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN), 
    EventOrderController.acceptCustomOrder
)


.patch(
    "/direct/accept/:orderId", 
    auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN), 
    EventOrderController.acceptDirectOrder
)

.patch(
    "/request-delivery/:orderId",
     auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH), 
     EventOrderController.requestOrderDelivery
    )

.patch(
    "/cancel/:orderId",
     auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER), 
     EventOrderController.requestOrderDelivery
    )

.patch(
    "/accept-delivery/:orderId",
     auth(USER_ROLE.USER), 
     EventOrderController.acceptDeliveryRequest
    )
    
.patch(
    "/decline-request/:orderId",
     auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER), 
     EventOrderController.declineOrderRequest
    )

.get(
    "/", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    EventOrderController.getAllEventOrders
)

.get(
    "/my-orders", 
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),  
    EventOrderController.getMyEventOrders
)

.get(
    "/delivered-orders", 
    auth(USER_ROLE.ADMIN),  
    EventOrderController.getAllDeliveredOrders
)

.get(
    "/user",
    auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
    // EventOrderController
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
