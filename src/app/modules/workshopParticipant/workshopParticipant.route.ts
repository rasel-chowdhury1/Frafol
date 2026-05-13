import express from 'express';
import { WorkshopParticipantController } from './workshopParticipant.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = express.Router();

router
    .post(
        '/', 
        WorkshopParticipantController.createWorkshopParticipant
    )

    .get(
        '/', 
        WorkshopParticipantController.getAllWorkshopParticipants
        )

    .get(
        '/:id', 
        WorkshopParticipantController.getWorkshopParticipantById
        )

    .patch(
        '/:id', 
        WorkshopParticipantController.updateWorkshopParticipant
    )

    .delete(
        '/:id',
        WorkshopParticipantController.deleteWorkshopParticipant
    )

    .patch(
        '/complete-instructor-payment/:id',
        auth(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
        WorkshopParticipantController.completeInstructorPayment
    );

export const WorkshopParticipantRoutes = router;
