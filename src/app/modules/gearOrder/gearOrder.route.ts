import express from 'express';
import { GearOrderController } from './gearOrder.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = express.Router();

router
    .post(
        '/checkout',
        auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),
        GearOrderController.createGearOrders
    )
    

    .patch(
        "/complete-payment/:gearOrderId",
        auth(USER_ROLE.ADMIN, USER_ROLE.COMPANY),
        GearOrderController.completePaymentGearOrder
        )

        // Seller requests delivery
        .patch(
        "/request-delivery/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.COMPANY),
        GearOrderController.requestGearMarketplaceDelivery
        )

        // Seller cancels the order
        .patch(
        "/cancel/:orderId",
        auth(USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),
        GearOrderController.cancelGearOrderBySeller
        )

        // Client accepts delivery request
        .patch(
        "/accept-delivery/:orderId",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY),
        GearOrderController.acceptGearDeliveryRequest
        )

        // Client declines delivery request
        .patch(
        "/decline-request/:orderId",
        auth(USER_ROLE.USER, USER_ROLE.COMPANY),
        GearOrderController.declineGearDeliveryRequest
        )
    
        .get('/', GearOrderController.getAllGearOrders)
        
        .get(
            "/my-orders", 
            auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN, USER_ROLE.COMPANY),  
            GearOrderController.getMyGearOrders
        )

        .get('/:id', GearOrderController.getGearOrderById)
        .patch('/:id', GearOrderController.updateGearOrder)
        .delete('/:id', GearOrderController.deleteGearOrder);

export const GearOrderRoutes = router;
