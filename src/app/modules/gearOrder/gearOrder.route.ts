import express from 'express';
import { GearOrderController } from './gearOrder.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = express.Router();

router
    .post(
        '/',
        auth(USER_ROLE.USER,USER_ROLE.PHOTOGRAPHER, USER_ROLE.VIDEOGRAPHER, USER_ROLE.BOTH, USER_ROLE.ADMIN),
        GearOrderController.createGearOrder
    )
    .get('/', GearOrderController.getAllGearOrders)
    .get('/:id', GearOrderController.getGearOrderById)
    .patch('/:id', GearOrderController.updateGearOrder)
    .delete('/:id', GearOrderController.deleteGearOrder);

export const GearOrderRoutes = router;
