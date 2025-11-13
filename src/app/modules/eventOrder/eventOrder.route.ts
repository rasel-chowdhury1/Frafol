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
        "/extension/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.requestExtension
    )

    .patch(
        "/extension/accept/:orderId", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.acceptExtensionRequest
    )
    .patch(
        "/extension/reject/:orderId", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.rejectExtensionRequest
    )

    .patch(
        "/request-delivery/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH), 
        EventOrderController.requestOrderDelivery
        )

    .patch(
        "/cancel-request/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN), 
        EventOrderController.cancelRequest
        )

    .patch(
        "/decline-cancel-request/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN), 
        EventOrderController.declineCancelRequest
        )
        
    .patch(
        "/approve-cancel/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN), 
        EventOrderController.approveCancelOrder
        )
        
    .patch(
        "/cancel/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN), 
        EventOrderController.approveCancelOrder
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

    .patch(
        "/:id/status", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.updateEventOrderStatus
    )

    

    .get(
        "/", 
        // auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
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
        "/extension-request",
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        EventOrderController.getMyExtensionEventOrders
    )

    .get(
        "/pending",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH),
        EventOrderController.getPendingEventOrders
    )

    
    .get(
        "/upcoming",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH),
        EventOrderController.getUpcomingEventsOfSpecificProfessional
    )

    .get(
        "/extension-request",
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        EventOrderController.getMyExtensionEventOrders
    )


    .get(
        "/professional/stats",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH),
        EventOrderController.getTotalStatsOfSpeceficProfessional
    )

    .get(
        "/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.getEventOrderById
    )


    .delete(
        "/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.deleteEventOrder
    );


export const EventOrderRoutes = router;
