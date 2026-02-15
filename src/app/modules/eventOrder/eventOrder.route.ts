import { Router } from "express";
import auth from "../../middleware/auth";
import { EventOrderController } from "./eventOrder.controller";
import { USER_ROLE } from "../user/user.constants";



const router = Router();


router.post(
    "/create", 
    auth(USER_ROLE.USER, USER_ROLE.COMPANY), 
    EventOrderController.createEventOrder
   )

    .patch(
        "/custom/accept/:orderId", 
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.acceptCustomOrder
    )


    .patch(
        "/direct/accept/:orderId", 
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.acceptDirectOrder
    )

    .patch(
        "/extension/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.requestExtension
    )

    .patch(
        "/extension/accept/:orderId", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.acceptExtensionRequest
    )
    .patch(
        "/extension/reject/:orderId", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.rejectExtensionRequest
    )

    .patch(
        "/request-delivery/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY), 
        EventOrderController.requestOrderDelivery
        )

    .patch(
        "/cancel-request/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.cancelRequest
     )

    .patch(
        "/decline-cancel-request/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.declineCancelRequest
        )
        
    .patch(
        "/approve-cancel/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.approveCancelOrder
        )
        
    .patch(
        "/cancel/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.approveCancelOrder
        )

    .patch(
        "/admin/cancel/:orderId",
        auth(USER_ROLE.ADMIN), 
        EventOrderController.cancelEventOrderByAdmin
    )

    .patch(
        "/accept-delivery/:orderId",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY), 
        EventOrderController.acceptDeliveryRequest
        )

    .patch(
        "/decline-request/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.USER), 
        EventOrderController.declineOrderRequest
        )
    
    .patch(
        "/complete-payment/:eventOrderId",
        auth( USER_ROLE.ADMIN, USER_ROLE.COMPANY),
        EventOrderController.completePaymentEventOrder
        )

    .patch(
        "/:id/status", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.updateEventOrderStatus
    )

    

    .get(
        "/", 
        // auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN), 
        EventOrderController.getAllEventOrders
    )

    .get(
        "/my-orders", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),  
        EventOrderController.getMyEventOrders
    )


    .get(
        "/delivered-orders", 
        auth(USER_ROLE.ADMIN),  
        EventOrderController.getAllDeliveredOrders
    )

    .get(
        "/user",
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        // EventOrderController
    )

    .get(
        "/extension-request",
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),
        EventOrderController.getMyExtensionEventOrders
    )

    .get(
        "/pending",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
        EventOrderController.getPendingEventOrders
    )

    
    .get(
        "/upcoming",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
        EventOrderController.getUpcomingEventsOfSpecificProfessional
    )

    .get(
        "/extension-request",
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),
        EventOrderController.getMyExtensionEventOrders
    )


    .get(
        "/professional/stats",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
        EventOrderController.getTotalStatsOfSpeceficProfessional
    )

    .get(
        "/user/stats",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY),
        EventOrderController.getTotalStatsOfSpeceficUser
    )

    .get(
        "/calendar",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
        EventOrderController.getServiceProviderCalendar
    )

    .get(
        "/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.getEventOrderById
    )


    .delete(
        "/:id", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY), 
        EventOrderController.deleteEventOrder
    );


export const EventOrderRoutes = router;
