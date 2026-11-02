import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../error/AppError";
import {
  sendEventOrderInvoiceEmail,
  sendGearOrderInvoiceEmail,
  sendWorkshopInvoiceEmail,
  sendWorkshopProfessionalFinalInvoiceEmail,
} from "../../utils/eamilNotifiacation";

const getRecipient = (req: Request) => {
  const to = req.query.to as string | undefined;
  if (!to) {
    throw new AppError(httpStatus.BAD_REQUEST, "Query param `to` (destination email) is required");
  }
  return to;
};

const today = () => new Date().toLocaleDateString("en-GB");

const testEventOrderInvoice = catchAsync(async (req: Request, res: Response) => {
  const to = getRecipient(req);

  await sendEventOrderInvoiceEmail({
    sentTo: to,
    customerName: "Ján Testovací",
    recipientName: "Ján Testovací",
    orderId: "EVT-TEST-0001",
    orderType: "direct",
    title: "Svadobná fotografia",
    serviceType: "photography",
    packageName: "Premium Wedding Package",
    eventDate: today(),
    eventTime: "14:00",
    location: "Bratislava, Slovensko",
    price: 500,
    serviceFee: 50,
    vatAmount: 20,
    couponCode: "TEST10",
    couponDiscount: 10,
    totalPrice: 560,
    transactionId: "txn_test_event_123456",
    paymentMethod: "stripe",
    paymentDate: today(),
    streetAddress: "Hlavná 1",
    town: "Bratislava",
    country: "Slovensko",
    isRegisterAsCompany: false,
    serviceProviderName: "Peter Fotograf",
    invoiceType: "payment",
    invoiceUrl: "https://frafol.sk/dashboard/my-account/orders",
    billInfoShow: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event order invoice test email sent to ${to}`,
    data: null,
  });
});

const testGearOrderInvoice = catchAsync(async (req: Request, res: Response) => {
  const to = getRecipient(req);

  const items = [
    {
      name: "Canon EOS R5",
      orderId: "GEAR-TEST-0001",
      basePrice: 2000,
      vatAmount: 80,
      totalPrice: 2080,
      shippingCost: 15,
      condition: "Nové",
    },
    {
      name: "50mm f/1.8 Objektív",
      orderId: "GEAR-TEST-0002",
      basePrice: 300,
      vatAmount: 12,
      totalPrice: 312,
      shippingCost: 5,
      condition: "Použité - výborný stav",
    },
  ];

  await sendGearOrderInvoiceEmail({
    sentTo: to,
    customerName: "Ján Testovací",
    items,
    subtotal: items.reduce((sum, i) => sum + i.totalPrice, 0),
    totalShipping: items.reduce((sum, i) => sum + i.shippingCost, 0),
    totalAmount: items.reduce((sum, i) => sum + i.totalPrice + i.shippingCost, 0),
    transactionId: "txn_test_gear_123456",
    paymentDate: today(),
    shippingAddress: "Hlavná 1",
    postCode: "811 01",
    town: "Bratislava",
    loginAsCompany: false,
    invoiceUrl: "https://frafol.sk/dashboard/my-account/orders",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Gear order invoice test email sent to ${to}`,
    data: null,
  });
});

const testWorkshopInvoice = catchAsync(async (req: Request, res: Response) => {
  const to = getRecipient(req);

  await sendWorkshopInvoiceEmail({
    sentTo: to,
    customerName: "Ján Testovací",
    workshopTitle: "Úvod do portrétnej fotografie",
    workshopDate: today(),
    workshopTime: "10:00",
    location: "Štúdio Bratislava",
    locationType: "offline",
    basePrice: 100,
    vatPercent: 20,
    vatAmount: 20,
    totalPrice: 120,
    orderId: "WS-TEST-0001",
    transactionId: "txn_test_workshop_123456",
    paymentDate: today(),
    streetAddress: "Hlavná 1",
    town: "Bratislava",
    country: "Slovensko",
    isRegisterAsCompany: false,
    instructorName: "Zuzana Lektorka",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Workshop invoice test email sent to ${to}`,
    data: null,
  });
});

const testWorkshopCompletedClient = catchAsync(async (req: Request, res: Response) => {
  const to = getRecipient(req);

  await sendWorkshopInvoiceEmail({
    sentTo: to,
    customerName: "Ján Testovací (Klient)",
    workshopTitle: "Masterclass portrétnej fotografie",
    workshopDate: today(),
    workshopTime: "10:00 - 15:00",
    location: "Ateliér Bratislava, Mlynské Nivy",
    locationType: "offline",
    basePrice: 150,
    vatPercent: 20,
    vatAmount: 30,
    totalPrice: 180,
    orderId: "WORKSHOP-20261031-0001",
    transactionId: "txn_test_client_final_12345",
    paymentDate: today(),
    streetAddress: "Hlavná 15",
    town: "Bratislava",
    country: "Slovensko",
    isRegisterAsCompany: false,
    instructorName: "Peter Hlavný (Lektor)",
    invoiceType: "completed",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Client post-workshop completed final invoice test email sent to ${to}`,
    data: null,
  });
});

const testWorkshopCompletedProfessional = catchAsync(async (req: Request, res: Response) => {
  const to = getRecipient(req);

  await sendWorkshopProfessionalFinalInvoiceEmail({
    sentTo: to,
    professionalName: "Peter Hlavný (Lektor)",
    workshopTitle: "Masterclass portrétnej fotografie",
    workshopDate: today(),
    workshopTime: "10:00 - 15:00",
    location: "Ateliér Bratislava, Mlynské Nivy",
    locationType: "offline",
    totalParticipants: 3,
    totalEarnings: 405, // e.g. 3 * 135 net earnings
    totalRevenue: 540,
    basePrice: 150,
    currency: "EUR",
    participants: [
      { name: "Ján Novák", orderId: "WORKSHOP-20261031-0001", amount: 135 },
      { name: "Martina Kováčová", orderId: "WORKSHOP-20261031-0002", amount: 135 },
      { name: "Tomáš Horváth", orderId: "WORKSHOP-20261031-0003", amount: 135 },
    ],
    isRegisterAsCompany: true,
    companyName: "Peter Photography s.r.o.",
    ICO: "12345678",
    DIC: "2021234567",
    IC_DPH: "SK2021234567",
    streetAddress: "Obchodná 25",
    town: "Bratislava",
    country: "Slovensko",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Professional post-workshop final invoice (15-day payout notice) test email sent to ${to}`,
    data: null,
  });
});

export const EmailTestController = {
  testEventOrderInvoice,
  testGearOrderInvoice,
  testWorkshopInvoice,
  testWorkshopCompletedClient,
  testWorkshopCompletedProfessional,
};
