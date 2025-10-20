import AppError from '../../error/AppError';
import { GearMarketplace } from '../gearMarketplace/gearMarketplace.model';
import { ICreateGearOrderPayload, IGearOrder } from './gearOrder.interface';
import { GearOrder } from './gearOrder.model';
import moment from "moment";
import httpStatus from 'http-status';
import { createGearStripePaymentSession } from '../payment/payment.utils';
import QueryBuilder from '../../builder/QueryBuilder';

const createGearOrder = async (payload: IGearOrder) => {
  const order = await GearOrder.create(payload);
  return order;
};

const createGearOrders = async (payload: ICreateGearOrderPayload) => {
  const {
    userId,
    gearMarketPlaceIds,
    name,
    shippingAddress,
    postCode,
    town,
    mobileNumber,
    email,
    loginAsCompany = false,
    ico = "",
    dic = "",
    ic_dph = "",
    deliveryNote = "",
  } = payload;

  if (!gearMarketPlaceIds?.length) {
    throw new AppError(httpStatus.BAD_REQUEST, "No gear marketplace IDs provided.");
  }

  // ✅ Fetch valid gear items
  const gearItems = await GearMarketplace.find({
    _id: { $in: gearMarketPlaceIds },
    isDeleted: false,
    approvalStatus: "approved",
    status: { $ne: "Sold Out" },
  });

  if (!gearItems.length) {
    throw new AppError(httpStatus.NOT_FOUND, "No valid gear marketplace items found.");
  }

  // ========================================
  // 🔢 Generate Custom Gear Order IDs
  // ========================================
  const today = moment().format("YYYYMMDD");
  const prefix = "GEAR";
  let orderCount = await GearOrder.countDocuments({
    createdAt: {
      $gte: moment().startOf("day").toDate(),
      $lte: moment().endOf("day").toDate(),
    },
  });

  // ========================================
  // 🛒 Create Gear Orders
  // ========================================
  const ordersToCreate = gearItems.map((item) => {
    orderCount += 1;
    const sequence = String(orderCount).padStart(4, "0");
    const customOrderId = `${prefix}-${today}-${sequence}`;

    return {
      orderId: customOrderId,
      clientId: userId,
      sellerId: item.authorId,
      gearMarketplaceId: item._id,
      orderStatus: "pending",
      paymentStatus: "pending",
      name,
      shippingAddress,
      postCode,
      town,
      mobileNumber,
      email,
      loginAsCompany,
      ico,
      dic,
      ic_dph,
      deliveryNote,
    };
  });

  const createdOrders = await GearOrder.insertMany(ordersToCreate);

  // ========================================
  // 💰 Calculate Total Payment (all sellers)
  // ========================================

  
  const totalShippingCharge = gearItems.reduce((acc,item) => acc + (item.shippingCompany.price || 0), 0);
  const totalAmount = gearItems.reduce((acc, item) => acc + (item.mainPrice || 0), 0);
  const totalPrice = gearItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const totalVatAmount = gearItems.reduce((acc,item) => acc + (item.vatAmount || 0), 0)
  
  const commission = totalAmount - (totalPrice + totalVatAmount); 
  const netAmount = (totalAmount - commission) + totalShippingCharge;
  // ========================================
  // 💳 Create Single Stripe Payment Session
  // ========================================
  const stripeSession = await createGearStripePaymentSession({
    userId,
    serviceProviderId: gearItems.map((g) => g.authorId), // multiple sellers
    gearOrderIds: createdOrders.map((o) => o._id),
    amount: totalAmount + totalShippingCharge,
    commission,
    netAmount,
    paymentMethod: "stripe",
  });

  // ========================================
  // ✅ Return Response
  // ========================================
  return  {
      checkoutUrl: stripeSession?.checkoutUrl,
      paymentId: stripeSession?.paymentId,
      totalAmount,
      totalCommission: commission,
      totalNetAmount: netAmount,
    };
}



const getAllGearOrders = async (query: Record<string, unknown>) => {
  const gearOrderQuery = new QueryBuilder(GearOrder.find({ isDeleted: false }), query)
    .filter() // apply filter by query params (e.g. clientId, sellerId, orderStatus)
    .search(['orderId', 'gearName', 'location']) // searchable fields (customize as needed)
    .sort()
    .paginate()
    .fields();

  const result = await gearOrderQuery.modelQuery
    .populate('clientId', 'name sureName')
    .populate('sellerId', 'name sureName')
    .populate('gearMarketplaceId', 'title price')
    .exec();

  const meta = await gearOrderQuery.countTotal();

  return { meta, result };
};

const getMyGearOrders = async (
  userId: string,
  role: "user" | "professional",
  tab: string,
  queryParams: Record<string, any> = {}
) => {
  // 🎯 Base query (non-deleted only)
  const baseQuery: any = { isDeleted: false };

  // 🎯 Role-based matching
  if (role === "professional") baseQuery.sellerId = userId;
  if (role === "user") baseQuery.clientId = userId;


  // 🧠 Initialize QueryBuilder
  const queryBuilder = new QueryBuilder(
    GearOrder.find(baseQuery)
      .populate("clientId", "name profileImage email")
      .populate("sellerId", "name profileImage email")
      .populate("gearMarketplaceId", " name price vatAmount platformCommission mainPrice description condition shippingCompany gallery status approvalStatus "),
    queryParams
  )
    .sort()
    .paginate()
    .fields();

  // ✅ Execute query and get total count
  const [result, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  // ✅ Return paginated result with meta
  return {
    meta,
    data: result,
  };
};

const getGearOrderById = async (id: string) => {
  const order = await GearOrder.findById(id).populate('clientId sellerId gearMarketplaceId');
  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  }
  return order;
};

const updateGearOrder = async (id: string, payload: Partial<IGearOrder>) => {
  const updated = await GearOrder.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true }
  );
  if (!updated) throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  return updated;
};

const deleteGearOrder = async (id: string) => {
  const deleted = await GearOrder.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, 'Gear order not found');
  return deleted;
};

export const GearOrderService = {
  createGearOrder,
  createGearOrders,
  getAllGearOrders,
  getMyGearOrders,
  getGearOrderById,
  updateGearOrder,
  deleteGearOrder,
};
