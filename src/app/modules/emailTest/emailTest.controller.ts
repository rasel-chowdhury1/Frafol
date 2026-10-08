import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../error/AppError";
import {
  sendEventOrderInvoiceEmail,
  sendGearOrderInvoiceEmail,
  sendWorkshopInvoiceEmail,
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

export const EmailTestController = {
  testEventOrderInvoice,
  testGearOrderInvoice,
  testWorkshopInvoice,
};
