import AppError from '../../error/AppError';
import { Payment } from './payment.model';
import { createStripePaymentSession, stripe } from './payment.utils';
import { GetPaymentsQuery, IPayment } from './payment.interface';
import { sentNotificationForPaymentSuccess } from '../../../socketIo';
import mongoose, { Types } from 'mongoose';
import { EventOrder } from '../eventOrder/eventOrder.model';
import { GearOrder } from '../gearOrder/gearOrder.model';
import { GearMarketplace } from '../gearMarketplace/gearMarketplace.model';
import { Workshop } from '../workshop/workshop.model';
import moment from 'moment';
import { WorkshopParticipant } from '../workshopParticipant/workshopParticipant.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { MySubscription } from '../mySubscription/mySubscription.model';
import { User } from '../user/user.model';
import { sendFrafolEmail, sendEmailAndNotification, sendEventOrderInvoiceEmail, sendWorkshopInvoiceEmail, sendGearOrderInvoiceEmail } from '../../utils/eamilNotifiacation';
import httpStatus from 'http-status';

/**
 * 🔹 Create Payment Session (Stripe Checkout)
 */
const createPaymentSession = async (payload: {
  userId: string;
  serviceProviderId: string;
  amount: number;
  originalCommission: number;
  commission: number;
  netAmount: number;
  couponCode?: string;
  couponDiscount: number;
  paymentMethod: 'stripe' | 'card' | 'bank';
  paymentType: 'event' | 'gear' | 'workshop' | 'subscription';
  eventOrderId?: string;
  workshopId?: string;
  gearOrderId?: string;
  subscriptionDays?: number;
  streetAddress?: string ;
  town?: string, 
  zipCode?: string;
  country?: string , 
  isRegisterAsCompany?: boolean, 
  companyName?: string, 
  ICO?: string, 
  DIC?: string, 
  IC_DPH?: string
}) => {

  return await createStripePaymentSession(payload);
};

/**
 * 🔹 Confirm Stripe Payment
 */
const confirmPayment = async (sessionId: string) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();


  try {
    // 🔹 Retrieve Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId);


 
    const paymentIntentId = session.payment_intent as string | null;

    if (!paymentIntentId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment intent not found in Stripe session',
      );
    }

    // 🔹 Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);



    if (!paymentIntent) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment intent not found in Stripe',
      );
    }

    // 🔹 Find local payment record by sessionId (not paymentIntentId)
    const payment = await Payment.findOne({ transactionId: sessionId }).session(
      dbSession,
    );





    if (!payment) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Payment record not found for this session',
      );
    }

    // 🔹 Handle Payment Status
    if (paymentIntent.status === 'succeeded') {
      payment.paymentStatus = 'completed';
      await payment.save({ session: dbSession });


      // ======================================================
      // ✅ EVENT Payment Handling
      // ======================================================
      if (payment.paymentType === 'event' && payment.eventOrderId) {
        const updatedOrder = await EventOrder.findByIdAndUpdate(
          payment.eventOrderId,
          {
            status: 'inProgress',
            paymentId: payment._id,
            'statusTimestamps.inProgressAt': new Date(),
            ...(payment.couponCode && { couponCode: payment.couponCode }),
            ...(payment.couponDiscount && { couponDiscount: payment.couponDiscount }),
            $push: {
              statusHistory: {
                status: 'inProgress',
                changedAt: new Date(),
              },
            },
          },
          { new: true, session: dbSession },
        );

        if (updatedOrder) {
          await sentNotificationForPaymentSuccess({
            orderType: updatedOrder.orderType as "direct" | "custom",
            userId: new mongoose.Types.ObjectId(payment.userId),
            receiverId: new mongoose.Types.ObjectId(payment.serviceProviderId),
            serviceType: updatedOrder.serviceType,
            packageName: updatedOrder.packageName || undefined,
          });

          // ✅ Send invoice email (non-blocking)
          process.nextTick(async () => {
            try {
              const [client, provider] = await Promise.all([
                User.findById(payment.userId).select('name email').lean(),
                User.findById(payment.serviceProviderId).select('name').lean(),
              ]);
              if (client?.email) {
                const price = updatedOrder.price || 0;
                const totalPrice = updatedOrder.totalPrice || payment.amount;
                const serviceFee = (updatedOrder.priceWithServiceFee || 0) - price;
                await sendEventOrderInvoiceEmail({
                  sentTo: client.email,
                  customerName: (client as any).name || payment.name || 'Customer',
                  orderId: updatedOrder.orderId,
                  orderType: updatedOrder.orderType as 'direct' | 'custom',
                  serviceType: updatedOrder.serviceType,
                  packageName: updatedOrder.packageName || undefined,
                  eventDate: updatedOrder.date ? new Date(updatedOrder.date).toLocaleDateString('en-GB') : '',
                  eventTime: updatedOrder.time || undefined,
                  location: updatedOrder.location || undefined,
                  price,
                  serviceFee: serviceFee > 0 ? serviceFee : 0,
                  vatAmount: updatedOrder.vatAmount || 0,
                  couponCode: updatedOrder.couponCode || undefined,
                  couponDiscount: updatedOrder.couponDiscount || 0,
                  totalPrice,
                  transactionId: payment.transactionId,
                  paymentMethod: payment.paymentMethod,
                  paymentDate: new Date().toLocaleDateString('en-GB'),
                  streetAddress: payment.streetAddress,
                  town: payment.town,
                  country: payment.country,
                  isRegisterAsCompany: payment.isRegisterAsCompany,
                  companyName: payment.companyName,
                  ICO: payment.ICO,
                  DIC: payment.DIC,
                  IC_DPH: payment.IC_DPH,
                  serviceProviderName: (provider as any)?.name || undefined,
                });
              }
            } catch (err) {
              console.error('❌ Event invoice email failed:', err);
            }
          });

          console.log(
            "✅ Payment succeeded & event order moved to 'inProgress'",
            {
              orderId: updatedOrder._id,
              paymentId: payment._id,
            },
          );
        }
      }

      // ======================================================
      // ✅ GEAR Payment Handling
      // ======================================================
      else if (payment.paymentType === 'gear' && payment.gearOrderIds?.length) {
        // Update all gear orders’ paymentStatus
        await GearOrder.updateMany(
          { _id: { $in: payment.gearOrderIds } },
          { orderStatus: 'inProgress', paymentId: payment._id },
          { session: dbSession },
        );

        // 2️⃣ Collect all related GearMarketplace IDs
        const relatedOrders = await GearOrder.find(
          { _id: { $in: payment.gearOrderIds } },
          { gearMarketplaceId: 1 },
        ).session(dbSession);

        const gearIds = relatedOrders.map((o) => o.gearMarketplaceId);

        // 3️⃣ Mark all related gear items as Sold Out
        await GearMarketplace.updateMany(
          { _id: { $in: gearIds } },
          { status: 'Sold Out' },
          { session: dbSession },
        );

        console.log(
          "✅ Payment succeeded & all gear orders marked as 'received'",
          {
            gearOrderCount: payment.gearOrderIds.length,
            paymentId: payment._id,
          },
        );

        // ✅ Send gear invoice email (non-blocking)
        process.nextTick(async () => {
          try {
            const populatedOrders = await GearOrder.find({ _id: { $in: payment.gearOrderIds } })
              .populate('gearMarketplaceId', 'name price vatAmount totalVatAmount mainPrice condition shippingCompany')
              .lean();

            const client = await User.findById(payment.userId).select('name email').lean();
            if (!client?.email) return;

            const firstOrder = populatedOrders[0] as any;
            const items = populatedOrders.map((o: any) => {
              const gear = o.gearMarketplaceId || {};
              return {
                name: gear.name || 'Gear Item',
                orderId: o.orderId,
                basePrice: gear.price || 0,
                vatAmount: gear.vatAmount || 0,
                totalPrice: gear.mainPrice || 0,
                shippingCost: gear.shippingCompany?.price || 0,
                condition: gear.condition || '',
              };
            });

            const subtotal = items.reduce((s: number, i: any) => s + i.totalPrice, 0);
            const totalShipping = items.reduce((s: number, i: any) => s + i.shippingCost, 0);

            await sendGearOrderInvoiceEmail({
              sentTo: client.email,
              customerName: (client as any).name || firstOrder?.name || 'Customer',
              items,
              subtotal,
              totalShipping,
              totalAmount: payment.amount,
              transactionId: payment.transactionId,
              paymentDate: new Date().toLocaleDateString('en-GB'),
              shippingAddress: firstOrder?.shippingAddress,
              postCode: firstOrder?.postCode,
              town: firstOrder?.town,
              loginAsCompany: firstOrder?.loginAsCompany,
              companyName: firstOrder?.companyName,
              ico: firstOrder?.ico,
              dic: firstOrder?.dic,
              ic_dph: firstOrder?.ic_dph,
            });
          } catch (err) {
            console.error('❌ Gear invoice email failed:', err);
          }
        });
      } 

      else if (payment.paymentType === 'workshop' && payment.workshopId) {


        // 1️⃣ Generate custom order ID
        const today = moment().format('YYYYMMDD');
        const prefix = 'WORKSHOP';
        const orderCount = await WorkshopParticipant.countDocuments({
          createdAt: {
            $gte: moment().startOf('day').toDate(),
            $lte: moment().endOf('day').toDate(),
          },
        });

        const sequence = String(orderCount + 1).padStart(4, '0');
        const customOrderId = `${prefix}-${today}-${sequence}`;

        // 2️⃣ Create Workshop Participant entry
        const participant = await WorkshopParticipant.create(
          [
            {
              orderId: customOrderId,
              clientId: payment.userId,
              instructorId: payment.serviceProviderId,
              workshopId: payment.workshopId,
              paymentStatus: 'completed',
              instructorPayment: {
                status: 'pending',
                amount: payment.netAmount,
                paidAt: null,
              },
              name: payment.name,
              streetAddress: payment.streetAddress,
              town: payment.town,
              zipCode: payment.zipCode,
              country: payment.country,
              isRegisterAsCompany: payment.isRegisterAsCompany,
              companyName: payment.companyName,
              ICO: payment.ICO,
              DIC: payment.DIC,
              IC_DPH: payment.IC_DPH,
              couponCode: payment.couponCode ?? undefined,
              couponDiscount: payment.couponDiscount ?? 0,
            },
          ],
          { session: dbSession },
        );

        // ✅ Send workshop invoice email (non-blocking)
        process.nextTick(async () => {
          try {
            const [client, workshop, instructor] = await Promise.all([
              User.findById(payment.userId).select('name email').lean(),
              Workshop.findById(payment.workshopId).select('title date time locationType location workshopLink price mainPrice vatAmount vatPercent').lean(),
              User.findById(payment.serviceProviderId).select('name').lean(),
            ]);
            if (client?.email && workshop) {
              const ws = workshop as any;
              const basePrice = ws.price || 0;
              const vatAmount = ws.vatAmount || 0;
              const totalPrice = ws.mainPrice || payment.amount;
              await sendWorkshopInvoiceEmail({
                sentTo: (client as any).email,
                customerName: (client as any).name || payment.name || 'Customer',
                workshopTitle: ws.title,
                workshopDate: ws.date ? new Date(ws.date).toLocaleDateString('en-GB') : '',
                workshopTime: ws.time || '',
                location: ws.locationType === 'online' ? (ws.workshopLink || '') : (ws.location || ''),
                locationType: ws.locationType,
                basePrice,
                vatPercent: ws.vatPercent || 0,
                vatAmount,
                totalPrice,
                orderId: customOrderId,
                transactionId: payment.transactionId,
                paymentDate: new Date().toLocaleDateString('en-GB'),
                streetAddress: payment.streetAddress,
                town: payment.town,
                country: payment.country,
                isRegisterAsCompany: payment.isRegisterAsCompany,
                companyName: payment.companyName,
                ICO: payment.ICO,
                DIC: payment.DIC,
                IC_DPH: payment.IC_DPH,
                instructorName: (instructor as any)?.name || undefined,
              });
            }
          } catch (err) {
            console.error('❌ Workshop invoice email failed:', err);
          }
        });
      } 
      else if (payment.paymentType === 'subscription' && payment.subscriptionDays) {


      const today = new Date();

      const existingSub = await MySubscription.findOne({
        userId: payment.userId,
        isActive: true,
      }).session(dbSession);

      let startDate = today;
      let expireDate = new Date(today);

      if (existingSub) {
        // Extend existing subscription
        startDate = existingSub.expireDate;
        expireDate = new Date(existingSub.expireDate);
        expireDate.setDate(
          expireDate.getDate() + (payment.subscriptionDays || 0),
        );

        existingSub.isActive = false;
        await existingSub.save({ session: dbSession });
      } else {
        // New subscription from today
        expireDate.setDate(
          expireDate.getDate() + (payment.subscriptionDays || 0),
        );
      }

      // Create new subscription record
      const result =await MySubscription.create(
        [
          {
            userId: payment.userId,
            paymentId: payment._id,
            howManyDays: payment.subscriptionDays || 0,
            startDate,
            expireDate,
            isActive: true,
          },
        ],
        { session: dbSession },
      );

      // ✅ Update user hasActiveSubscription = true
      const updateUser = await User.findByIdAndUpdate(
        payment.userId,
        { 
          subscriptionId: result[0]._id,
          hasActiveSubscription: true,
          subscriptionExpiryDate: expireDate,
          subscriptionDays: payment.subscriptionDays
         },
        { session: dbSession },
      );

        // Send email & notification without blocking
        sendEmailAndNotification({
          userId: (updateUser as any)._id,
          email: (updateUser as any).email,
          name: (updateUser as any).name || '',
          notificationText: 'Your Frafol Choice has been successfully activated on your profile. 🚀 Your profile now gets higher visibility and priority placement on Frafol.',
          orderId: payment.transactionId,
          planName: `Frafol Choice – ${payment.subscriptionDays} days`,
          planDays: payment.subscriptionDays,
          amount: payment.amount,
          currency: 'EUR',
          purchaseDate: new Date().toLocaleDateString('en-GB'),
          expiryDate: expireDate.toLocaleDateString('en-GB'),
        });

      console.log('✅ Subscription activated successfully', {
        userId: payment.userId,
        days: payment.subscriptionDays,
        expireDate,
      });
    } 
    else {
      payment.paymentStatus = 'failed';
      await payment.save({ session: dbSession });
      console.log('❌ Payment failed for session:', sessionId);
    }

    // ✅ Commit all DB changes
    await dbSession.commitTransaction();
    dbSession.endSession();

    return payment;
  } 
}
  catch (error) {
    // ❌ Rollback all DB operations on failure
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error('❌ Transaction rolled back due to error:', error);
    throw error;
  }
};

// const confirmStripePayment = async (req: Request, res: Response) => {
//   try {
//     const { sessionId, transactionId } = req.query;

//     if (!sessionId || !transactionId) {
//       throw new AppError(400, "Missing sessionId or transactionId");
//     }

//     // Retrieve session from Stripe
//     const session = await stripe.checkout.sessions.retrieve(sessionId as string);

//     // Verify payment success
//     if (session.payment_status === "paid") {
//       // Update payment record
//       await Payment.findOneAndUpdate(
//         { transactionId },
//         { paymentStatus: "success" },
//         { new: true }
//       );

//       // (optional) Trigger order-in-progress notification
//       // sentNotificationForPaymentSuccess(...);

//       return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
//     } else {
//       await Payment.findOneAndUpdate(
//         { transactionId },
//         { paymentStatus: "failed" }
//       );
//       return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
//     }
//   } catch (error) {
//     console.error("Error confirming payment:", error);
//     return res.redirect(`${process.env.FRONTEND_URL}/payment-error`);
//   }
// };

/**
 * 🔹 Cancel Payment
 */
const cancelPayment = async (transactionId: string) => {
  const payment = await Payment.findOne({ transactionId });

  if (!payment) throw new AppError(404, 'Payment not found');

  payment.paymentStatus = 'pending'; // keep it pending or custom logic
  await payment.save();

  return payment;
};

// const getPayments = async (query: any) => {
//   const filter: Record<string, any> = {};

//   // Filter by paymentStatus, paymentType, paymentMethod
//   if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
//   if (query.paymentType && query.paymentType !== 'all') filter.paymentType = query.paymentType;
//   if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

//   // Filter by date range
//   if (query.startDate || query.endDate) {
//     filter.createdAt = {};
//     if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
//     if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
//   }

//   // Build query with QueryBuilder
//   const paymentQuery = new QueryBuilder(
//     Payment.find(filter)
//       .populate('userId', 'name profileImage email')
//       .populate('serviceProviderId', 'name profileImage email')
//       .populate('serviceProviders.serviceProviderId'),
//     query,
//   )
//     .search(['transactionId', 'userId.name', 'serviceProviderId.name'])
//     .filter()
//     .sort()
//     .paginate()
//     .fields();

//   const payments = await paymentQuery.modelQuery;
//   const meta = await paymentQuery.countTotal();

//   return { meta, payments };
// };



const getPayments = async (query: any) => {
  const filter: Record<string, any> = {paymentStatus: "completed"};

  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.paymentType && query.paymentType !== 'all') filter.paymentType = query.paymentType;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const paymentQuery = new QueryBuilder(
    Payment.find(filter)
      .populate('userId', 'name companyName profileImage email ico dic ic_dph  address town zipCode')
      .populate('eventOrderId', 'title orderId serviceType orderType date price priceWithServiceFee vatAmount couponCode couponDiscount totalPrice')
      .populate('workshopId', 'orderId title date time price mainPrice vatAmount couponCode couponDiscount')
      .populate('serviceProviderId', 'name companyName profileImage email ico dic ic_dph  address town zipCode')
      .populate('serviceProviders.serviceProviderId', 'name email  address town zipCode')
      .populate({
        path: 'gearOrderIds',
        select: 'orderId paymentStatus orderStatus sellerId clientId',
        populate: [
          { path: 'gearMarketplaceId', select: 'name price mainPrice vatAmount totalVatAmount platformCommission shippingCompany' },
          { path: 'sellerId', select: 'name companyName profileImage email ico dic ic_dph  address town zipCode' },
          { path: 'clientId', select: 'name companyName profileImage email ico dic ic_dph  address town zipCode' },
        ],
      }),
    query,
  )
    .search(['transactionId', 'userId.name', 'serviceProviderId.name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const payments = await paymentQuery.modelQuery;
  const meta = await paymentQuery.countTotal();

  // ✅ Flatten gear payments — each gear order becomes its own row
  const orders: any[] = [];

  for (const payment of payments) {
    const p = payment.toObject ? payment.toObject() : payment;

    if (p.paymentType === 'gear') {
      for (const g of (p.gearOrderIds || []) as any[]) {
        const sp = p.serviceProviders?.find(
          (s: any) => s.serviceProviderId?._id?.toString() === g.sellerId?._id?.toString(),
        );
        orders.push({
          paymentId: p._id,
          transactionId: p.transactionId,
          paymentType: p.paymentType,
          paymentStatus: p.paymentStatus,
          paymentMethod: p.paymentMethod,
          totalPaymentAmount: p.amount,
          createdAt: p.createdAt,
          client: p.userId,
          // Individual gear order fields
          orderId: g.orderId,
          gearOrderId: g._id,
          orderStatus: g.orderStatus,
          adminPaid: g.paymentStatus === 'received',
          gear: g.gearMarketplaceId,
          seller: g.sellerId,
          amount: sp?.amount ?? 0,
          commission: sp?.commission ?? 0,
          netEarning: sp?.netAmount ?? 0,
        });
      }
    } else {
      orders.push(p);
    }
  }

  return { meta, orders };
};

const getMyPaymentsStats = async (userId: string) => {
  if (!userId) throw new Error('userId is required');

  const stats = await Payment.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },

    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
        totalOrders: { $sum: 1 },
      },
    },
  ]);


  return {
    totalSpent: stats[0]?.totalSpent || 0,
    totalOrders: stats[0]?.totalOrders || 0,
  };
};

const getMyPayments = async (userId: string, query: any) => {
  if (!userId) throw new Error('userId is required');

  const filter: Record<string, any> = { userId };

  // Optional filters
  if (query.paymentType && query.paymentType !== 'all') filter.paymentType = query.paymentType;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  // Build query with QueryBuilder
  const qb = new QueryBuilder(
    Payment.find(filter)
      .populate('userId', 'name profileImage email')
      .populate('serviceProviderId', 'name profileImage email')
      .populate('serviceProviders.serviceProviderId', 'name profileImage email')

      // ✅ FULL NESTED POPULATE for gear orders
      .populate({
        path: 'gearOrderIds',
        select: 'orderId paymentStatus orderStatus statusTimestamps createdAt',
        populate: [
          {
            path: 'sellerId',
            select: 'name email mobileNumber profileImage userType',
          },
          {
            path: 'gearMarketplaceId',
            select: 'title price category name description images',
          },
        ],
      })

      // ✅ Populate workshop info (unchanged)
      .populate('workshopId', 'title price location startDate endDate')
      .populate({
        path: 'eventOrderId',
        select:
          'title orderId orderType serviceType date location totalPrice couponCode couponDiscount packageId statusTimestamps',
        populate: [
          {
            path: 'packageId',
            select: 'title',
          },
        ],
      }),
    query,
  )
    .search(['transactionId', 'userId.name', 'serviceProviderId.name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const payments = await qb.modelQuery;
  const meta = await qb.countTotal();

  return { meta, payments };
};

export const PaymentService = {
  createPaymentSession,
  confirmPayment,
  cancelPayment,
  getPayments,
  getMyPayments,
  getMyPaymentsStats,
};
