import express from 'express';
import { WorkshopParticipantController } from './workshopParticipant.controller';

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
    );

export const WorkshopParticipantRoutes = router;
