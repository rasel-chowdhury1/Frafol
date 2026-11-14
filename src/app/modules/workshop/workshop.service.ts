import { isWorkshopFinished, formatWorkshopDate } from '../../utils/workshopTime';
import { Workshop } from "./workshop.model";
import { IWorkshop, IUpdateWorkshop } from "./workshop.interface";
import QueryBuilder from "../../builder/QueryBuilder";
import { deleteFileFromS3, resolveFileUrl } from "../../helpers/s3FileHelper";
import AppError from "../../error/AppError";
import { WorkshopParticipant } from "../workshopParticipant/workshopParticipant.model";
import httpStatus from 'http-status';
import mongoose from "mongoose";
import {
  sentNotificationForWorkshopApproved,
  sentNotificationForWorkshopDeclined,
  sentNotificationForWorkshopCompletedToInstructor,
  sentNotificationForWorkshopCompletedToClient,
} from "../../../socketIo";
import { CommissionSetupService } from "../../commissionSetup/commissionSetup.service";
import { User } from "../user/user.model";
import { Payment } from "../payment/payment.model";
import config from "../../config";
import { USER_ROLE } from "../user/user.constants";
import {
  sendWorkshopInvoiceEmail,
  sendWorkshopProfessionalFinalInvoiceEmail,
} from "../../utils/eamilNotifiacation";


const createWorkshop = async (payload: IWorkshop) => {


  // ✅ Keep vatPercent as percentage (e.g., 15 for 15%)
  payload.vatPercent = payload.vatAmount as number;

  // ✅ Calculate actual VAT amount based on main price
  payload.vatAmount = (payload.price * payload.vatPercent) / 100;

  // ✅ Pull the current workshop service-fee (commission) percent from the
  // admin-managed commission setup and calculate the amount based on price.
  const commissionSetup = await CommissionSetupService.getCommissionSetup();
  payload.serviceFeePercent = commissionSetup.workShop;
  payload.serviceFeeAmount = (payload.price * commissionSetup.workShop) / 100;

  const result = await Workshop.create(payload);

  return result;
};


const getAllWorkshops = async (query: Record<string, any> = {}) => {
  const workshopQuery = new QueryBuilder(
    Workshop.find({ isDeleted: false, approvalStatus: "approved", date: { $gte: new Date() } }).populate({
      path: "authorId",
      select: "name sureName role profileImage",
    }),
    query
  )
    .search(["title", "description", "location"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const workshops = await workshopQuery.modelQuery;
  const meta = await workshopQuery.countTotal();

    // ✅ Add total participants count for each workshop
  const result = await Promise.all(
    workshops.map(async (workshop: any) => {
      const totalParticipants = await WorkshopParticipant.countDocuments({
        workshopId: workshop._id,
        isDeleted: false,
      });

      return {
        ...workshop.toObject(),
        image: await resolveFileUrl(workshop.image),
        totalParticipants,
      };
    })
  );

  return { meta, result };
};

const getAllWorkshopsForAdmin = async (query: Record<string, any> = {}) => {
  const workshopQuery = new QueryBuilder(
    Workshop.find({ isDeleted: false }).populate({
      path: "authorId",
      select: "name sureName role profileImage",
    }),
    query
  )
    .search(["title", "description", "location"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const workshops = await workshopQuery.modelQuery;
  const meta = await workshopQuery.countTotal();

  const result = await Promise.all(
    workshops.map(async (workshop: any) => {
      const totalParticipants = await WorkshopParticipant.countDocuments({
        workshopId: workshop._id,
        isDeleted: false,
      });

      return {
        ...workshop.toObject(),
        image: await resolveFileUrl(workshop.image),
        totalParticipants,
      };
    })
  );

  return { meta, result };
};

const getWorkshopById = async (id: string) => {
  const workshop = await Workshop.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "authorId",
      select: "name sureName role profileImage",
    })
    .lean();

  if (!workshop) return workshop;
  return { ...workshop, image: await resolveFileUrl((workshop as any).image) };
};

const getMyWorkshops = async (userId: string, query: Record<string, unknown>) => {
  const gearQuery = new QueryBuilder(
    Workshop.find({ authorId:userId,isDeleted: false })
      .populate({path: "authorId", select: "name sureName role profileImage" }),
    query
  )
    .search(["name", "title", "locationType", "location",  "description"]) // searchable fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const workshops = await gearQuery.modelQuery;
  const meta = await gearQuery.countTotal();

      // ✅ Add total participants count for each workshop
  const result = await Promise.all(
    workshops.map(async (workshop: any) => {
      const totalParticipants = await WorkshopParticipant.countDocuments({
        workshopId: workshop._id,
        isDeleted: false,
      });

      return {
        ...workshop.toObject(),
        image: await resolveFileUrl(workshop.image),
        totalParticipants,
      };
    })
  );

  return { meta, result };
};

const getMyRegisteredWorkshops = async (userId: string, query: Record<string, unknown>) => {
  const workshopQuery = new QueryBuilder(
    WorkshopParticipant.find({ clientId: userId, isDeleted: false })
      .populate({
        path: "workshopId",
        populate: {
          path: "authorId",
          select: "name companyName sureName address town zipCode role profileImage ico dic ic_dph  ",
        },
      }),
    query
  )
    .search(["workshopId.title", "workshopId.description", "workshopId.location"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const participants = await workshopQuery.modelQuery;
  const meta = await workshopQuery.countTotal();

  // ✅ Format response to include direct workshop info
  const result = participants.map((p: any) => ({
    ...p.toObject(),
    workshop: p.workshopId,
  }));

  return { meta, result };
};

const getPendingWorkshops = async (
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    approvalStatus: "pending",
    isDeleted: false
  };

  const userQuery = new QueryBuilder(Workshop.find(roleFilter)
                                              .populate({path: "authorId", select: "name sureName role profileImage" }), query)
    .search(['title', 'description']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const workshops = await userQuery.modelQuery.lean();
  const meta = await userQuery.countTotal();

  const result = await Promise.all(
    workshops.map(async (w: any) => ({ ...w, image: await resolveFileUrl(w.image) })),
  );

  return { meta, result };
};


const getParticipantsByWorkshop = async (workshopId: string) => {

  const participants = await WorkshopParticipant.find({workshopId,isDeleted: false})
                                                .populate('clientId', 'name email profileImage address town zipCode')
                                                .populate('instructorId', 'name companyName email profileImage ico dic ic_dph address town zipCode')
                                                .populate('workshopId', 'title date time price mainPrice vatAmount');



  return participants || [];

}


const updateWorkshop = async (
  id: string,
  userId: string,
  payload: IUpdateWorkshop
) => {
  let oldImageKey: string | undefined;

  // ✅ Case 1: If new image provided → fetch old workshop first
  if (payload.image) {
    const existing = await Workshop.findOne({
      _id: id,
      authorId: userId,
      isDeleted: false,
    });

    if (!existing) {
      throw new Error("Workshop not found or you don't have permission");
    }

    oldImageKey = existing.image;
  }

  const updated = await Workshop.findOneAndUpdate(
    { _id: id, authorId: userId, isDeleted: false },
    payload,
    { new: true }
  );

  // Only remove the old S3 object once the new one is saved
  if (oldImageKey) {
    deleteFileFromS3(oldImageKey).catch((err) =>
      console.error('Failed to delete old workshop image from S3:', err),
    );
  }

  return updated;
};

const updateApprovalStatusByAdmin = async (id: string, status: string, reason?: string) => {
  const updateData: Record<string, any> = { approvalStatus: status };
  if (status === 'cancelled' && reason) {
    updateData.declineReason = reason;
  }

  const workshop = await Workshop.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updateData,
    { new: true }
  ).populate({ path: 'authorId', select: 'name email' });

  if (workshop && status === 'approved') {
    sentNotificationForWorkshopApproved({
      receiverId: workshop.authorId as mongoose.Types.ObjectId,
      workshopTitle: workshop.title,
    }).catch((err) => console.error('Workshop approved notification failed:', err));
  } else if (workshop && status === 'cancelled' && reason) {
    sentNotificationForWorkshopDeclined({
      receiverId: workshop.authorId as mongoose.Types.ObjectId,
      workshopTitle: workshop.title,
      reason,
    }).catch((err) => console.error('Workshop declined notification failed:', err));
  }

  return workshop;
};

const declineWorkshopById = async (id: string, reason: string) => {
  const workshop = await Workshop.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, approvalStatus: 'cancelled', declineReason: reason },
    { new: true, runValidators: true }
  ).populate({ path: 'authorId', select: 'name email' });

  if (!workshop) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the workshop or workshop not found');
  }

  sentNotificationForWorkshopDeclined({
    receiverId: workshop.authorId as mongoose.Types.ObjectId,
    workshopTitle: workshop.title,
    reason,
  }).catch((err) => console.error('Workshop declined notification failed:', err));

  return workshop;
};

const deleteWorkshop = async (id: string, userId: string, role: string) => {
  const filter: any = { _id: id, isDeleted: false };

  if (role !== "admin") {
    filter.authorId = userId; // only add this check for normal users
  }

  return await Workshop.findOneAndUpdate(
    filter,
    { isDeleted: true },
    { new: true }
  );
};

// How long one run may "own" a workshop's completion before another run may take over
// (covers a crashed / hung run; it is also the back-off before a failed email is retried).
export const WORKSHOP_COMPLETION_LEASE_MS = 30 * 60 * 1000;

/**
 * Sends the post-workshop final invoices (participants + instructor) exactly once.
 *
 * Duplicate protection (all atomic, at database level):
 *  1. The WORKSHOP is claimed with a lease (`completionClaimedAt`): only one run processes it.
 *  2. Every RECIPIENT is claimed (participant.finalInvoiceSent / workshop.instructorFinalInvoiceSent)
 *     with a conditional update BEFORE its email is sent. Only the run that wins the claim sends.
 *  3. If sending fails, that recipient's claim is released, the workshop is NOT marked as done, and the
 *     lease expires after 30 minutes → the next scheduler run retries ONLY the recipients that are still
 *     missing (successful ones are never mailed again).
 */
const processWorkshopCompletion = async (
  workshopId: string | mongoose.Types.ObjectId,
  now: Date = new Date(),
) => {
  const workshop = await Workshop.findById(workshopId);
  if (!workshop || workshop.isDeleted) {
    return null;
  }

  // Already fully processed
  if (workshop.postWorkshopEmailsSent) {
    return workshop;
  }

  // Safety net: the "workshop done" emails must never go out before the workshop has ended
  if (!isWorkshopFinished(workshop.date, workshop.time, now)) {
    return null;
  }

  // 1. Claim the workshop (lease). Null = another run owns it right now, or it was just completed.
  const claimed = await Workshop.findOneAndUpdate(
    {
      _id: workshop._id,
      isDeleted: { $ne: true },
      postWorkshopEmailsSent: { $ne: true },
      $or: [
        { completionClaimedAt: null }, // never claimed (matches missing too)
        { completionClaimedAt: { $lte: new Date(now.getTime() - WORKSHOP_COMPLETION_LEASE_MS) } },
      ],
    },
    { $set: { completionClaimedAt: now } },
    { new: true },
  );
  if (!claimed) {
    return null;
  }

  const [instructor, participants] = await Promise.all([
    User.findById(claimed.authorId)
      .select('name email role companyName ico dic ic_dph address town country isRegisterAsCompany')
      .lean(),
    WorkshopParticipant.find({
      workshopId: claimed._id,
      isDeleted: false,
      paymentStatus: 'completed',
    }),
  ]);

  // Slovak calendar day (toLocaleDateString would use the server's timezone and can be a day off)
  const workshopDateStr = claimed.date ? formatWorkshopDate(claimed.date) : '';
  const workshopLocation =
    claimed.locationType === 'online'
      ? claimed.workshopLink || ''
      : claimed.location || '';

  let failures = 0;

  // 2. Final invoice emails to the enrolled clients (participants)
  for (const participant of participants) {
    if (participant.finalInvoiceSent) continue; // already mailed in an earlier run

    // Atomic per-recipient claim — only the run that flips the flag may send
    const won = await WorkshopParticipant.findOneAndUpdate(
      { _id: participant._id, finalInvoiceSent: { $ne: true } },
      { $set: { finalInvoiceSent: true } },
      { new: true },
    );
    if (!won) continue;

    try {
      const [clientUser, payment] = await Promise.all([
        User.findById(participant.clientId).select('name email role').lean(),
        Payment.findOne({
          workshopId: claimed._id,
          userId: participant.clientId,
          paymentStatus: 'completed',
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const clientEmail = (clientUser as any)?.email;
      if (clientEmail) {
        let invoiceUrl = `${config.FRONTEND_URL}/dashboard/my-account/my-workshop`;
        if (
          clientUser?.role &&
          ['photographer', 'videographer', 'both'].includes(clientUser.role)
        ) {
          invoiceUrl = `${config.FRONTEND_URL}/dashboard/professional/workshop`;
        }

        const basePrice = claimed.price || 0;
        const vatAmount = claimed.vatAmount || 0;
        const totalPrice =
          payment?.amount || claimed.mainPrice || claimed.price || 0;

        await sendWorkshopInvoiceEmail({
          sentTo: clientEmail,
          customerName:
            (clientUser as any)?.name || participant.name || 'Účastník',
          workshopTitle: claimed.title,
          workshopDate: workshopDateStr,
          workshopTime: claimed.time || '',
          location: workshopLocation,
          locationType: claimed.locationType,
          basePrice,
          vatPercent: claimed.vatPercent || 0,
          vatAmount,
          totalPrice,
          orderId: participant.orderId,
          transactionId: payment?.transactionId || participant.orderId,
          // Slovak calendar day (server-local formatting can be a day off)
          paymentDate: formatWorkshopDate(
            payment?.createdAt || participant.createdAt || new Date(),
          ),
          streetAddress: participant.streetAddress,
          town: participant.town,
          country: participant.country,
          isRegisterAsCompany: participant.isRegisterAsCompany,
          companyName: participant.companyName,
          ICO: participant.ICO,
          DIC: participant.DIC,
          IC_DPH: participant.IC_DPH,
          instructorName: (instructor as any)?.name,
          invoiceUrl,
          invoiceType: 'completed',
        });
      }

      // In-app socket notification for client (only after the email succeeded, once per recipient)
      sentNotificationForWorkshopCompletedToClient({
        clientId: participant.clientId as any,
        workshopTitle: claimed.title,
      }).catch((err) =>
        console.error('Failed to send workshop client socket notification:', err),
      );

      await WorkshopParticipant.updateOne(
        { _id: participant._id },
        { $set: { isCompleted: true } },
      );
    } catch (clientErr) {
      failures++;
      // Release this recipient's claim so the next run retries it
      await WorkshopParticipant.updateOne(
        { _id: participant._id },
        { $set: { finalInvoiceSent: false } },
      ).catch((e) => console.error('Failed to release participant claim:', e));
      console.error(
        `Failed to process workshop final invoice for participant ${participant._id}:`,
        clientErr,
      );
    }
  }

  // 3. Final invoice email with 15-day payout notice to the professional (instructor)
  if ((instructor as any)?.email && !claimed.instructorFinalInvoiceSent) {
    const wonInstructor = await Workshop.findOneAndUpdate(
      { _id: claimed._id, instructorFinalInvoiceSent: { $ne: true } },
      { $set: { instructorFinalInvoiceSent: true } },
      { new: true },
    );

    if (wonInstructor) {
      try {
        const totalParticipants = participants.length;
        let totalEarnings = participants.reduce(
          (sum, p) => sum + (p.instructorPayment?.amount || 0),
          0,
        );
        const totalRevenue = participants.reduce(
          (sum, p) => sum + (claimed.mainPrice || claimed.price || 0),
          0,
        );

        // Fallback if instructorPayment amount was not explicitly recorded
        if (totalEarnings === 0 && totalParticipants > 0) {
          totalEarnings = (claimed.price || claimed.mainPrice || 0) * totalParticipants;
        }

        const participantItems = participants.map((p) => ({
          name: p.name || 'Účastník',
          orderId: p.orderId,
          amount: p.instructorPayment?.amount || claimed.price || 0,
        }));

        await sendWorkshopProfessionalFinalInvoiceEmail({
          sentTo: (instructor as any).email,
          professionalName: (instructor as any).name || 'Lektor',
          workshopTitle: claimed.title,
          workshopDate: workshopDateStr,
          workshopTime: claimed.time || '',
          location: workshopLocation,
          locationType: claimed.locationType,
          totalParticipants,
          totalEarnings,
          totalRevenue: totalRevenue > 0 ? totalRevenue : undefined,
          basePrice: claimed.price,
          currency: 'EUR',
          participants: participantItems,
          streetAddress: claimed.streetAddress || (instructor as any)?.address,
          town: claimed.town || (instructor as any)?.town,
          country: claimed.country || (instructor as any)?.country,
          isRegisterAsCompany:
            claimed.isRegisterAsCompany ||
            (instructor as any)?.isRegisterAsCompany,
          companyName:
            claimed.companyName || (instructor as any)?.companyName,
          ICO: claimed.ICO || (instructor as any)?.ico,
          DIC: claimed.DIC || (instructor as any)?.dic,
          IC_DPH: claimed.IC_DPH || (instructor as any)?.ic_dph,
          invoiceUrl: `${config.FRONTEND_URL}/dashboard/professional/workshop`,
        });

        // In-app socket notification for instructor
        sentNotificationForWorkshopCompletedToInstructor({
          instructorId: claimed.authorId as any,
          workshopTitle: claimed.title,
        }).catch((err) =>
          console.error(
            'Failed to send workshop instructor socket notification:',
            err,
          ),
        );
      } catch (instErr) {
        failures++;
        await Workshop.updateOne(
          { _id: claimed._id },
          { $set: { instructorFinalInvoiceSent: false } },
        ).catch((e) => console.error('Failed to release instructor claim:', e));
        console.error(
          `Failed to send workshop final invoice to instructor ${claimed.authorId}:`,
          instErr,
        );
      }
    }
  }

  // 4. Everyone was mailed → mark the workshop completed. Otherwise leave it open: the lease
  //    expires and the next run retries only the recipients that are still missing.
  if (failures > 0) {
    return claimed;
  }

  return Workshop.findOneAndUpdate(
    { _id: claimed._id, postWorkshopEmailsSent: { $ne: true } },
    {
      $set: {
        isCompleted: true,
        completedAt: new Date(),
        postWorkshopEmailsSent: true,
        completionClaimedAt: null,
      },
    },
    { new: true },
  );
};

export const WorkshopService = {
  createWorkshop,
  getAllWorkshops,
  getAllWorkshopsForAdmin,
  getWorkshopById,
  getMyWorkshops,
  getMyRegisteredWorkshops,
  getPendingWorkshops,
  getParticipantsByWorkshop,
  updateWorkshop,
  updateApprovalStatusByAdmin,
  declineWorkshopById,
  deleteWorkshop,
  processWorkshopCompletion,
};
