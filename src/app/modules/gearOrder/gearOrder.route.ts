import express from 'express';
import { GearOrderController } from './gearOrder.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = express.Router();

router
    .post(
        '/checkout',
        auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        GearOrderController.createGearOrders
    )
    .get('/', GearOrderController.getAllGearOrders)
    
    .get(
        "/my-orders", 
        auth(USER_ROLE.USER, USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),  
        GearOrderController.getMyGearOrders
    )

    .get('/:id', GearOrderController.getGearOrderById)
    .patch('/:id', GearOrderController.updateGearOrder)
    .delete('/:id', GearOrderController.deleteGearOrder);

export const GearOrderRoutes = router;
