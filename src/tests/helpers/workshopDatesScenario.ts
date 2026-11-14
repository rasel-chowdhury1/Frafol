/**
 * Child-process scenario for workshopDates.test.ts — runs under a chosen host timezone (TZ env var).
 * Prints, as JSON, every dd/mm/yyyy date found in each workshop email that the real code produces:
 *   - payment-time invoice email            (PaymentService.sendWorkshopPaymentEmails)
 *   - payment-time new-participant email    (sentNotificationForWorkshopNewParticipant, called by the same function)
 *   - post-workshop completion emails       (WorkshopService.processWorkshopCompletion)
 * No database and no SMTP: models are in-memory fakes, the mail sender is a stub.
 */
import { installMailStub, sentMails, FakeCollection, oid } from './fakeDb';

installMailStub();

/* eslint-disable @typescript-eslint/no-var-requires */
const { Workshop } = require('../../app/modules/workshop/workshop.model');
const { WorkshopParticipant } = require('../../app/modules/workshopParticipant/workshopParticipant.model');
const { User } = require('../../app/modules/user/user.model');
const { Payment } = require('../../app/modules/payment/payment.model');
const { PaymentService } = require('../../app/modules/payment/payment.service');
const { WorkshopService } = require('../../app/modules/workshop/workshop.service');
const moment = require('moment-timezone');
/* eslint-enable @typescript-eslint/no-var-requires */

const users = new FakeCollection();
const workshops = new FakeCollection();
const participants = new FakeCollection();
const payments = new FakeCollection();
users.install(User);
workshops.install(Workshop);
participants.install(WorkshopParticipant);
payments.install(Payment);

// CASES = JSON array of { stored, afterEnd } (ISO strings). Each case runs on a clean in-memory database.
const cases: { stored: string; afterEnd: string }[] = JSON.parse(process.env.CASES as string);

const dates = (html: string) => html.match(/\d{2}\/\d{2}\/\d{4}/g) || [];

const runCase = async ({ stored, afterEnd }: { stored: string; afterEnd: string }) => {
  [users, workshops, participants, payments].forEach((c) => c.reset());
  sentMails.length = 0;

  const instructor = users.insert({ _id: oid(), name: 'Lektor', email: 'instructor@example.com', role: 'photographer' });
  const client = users.insert({ _id: oid(), name: 'Klient', email: 'client@example.com', role: 'user' });
  const ws = workshops.insert({
    _id: oid(), authorId: instructor._id, title: 'Portrait course', date: new Date(stored), time: '10:00 - 13:00',
    locationType: 'offline', location: 'Bratislava', price: 50, mainPrice: 60, vatAmount: 5, vatPercent: 10,
    approvalStatus: 'approved', isDeleted: false, postWorkshopEmailsSent: false, completionClaimedAt: null,
    instructorFinalInvoiceSent: false,
  });
  participants.insert({
    _id: oid(), orderId: 'WORKSHOP-1', clientId: client._id, workshopId: ws._id, instructorId: instructor._id,
    paymentStatus: 'completed', isDeleted: false, finalInvoiceSent: false, instructorPayment: { amount: 40 },
    createdAt: new Date(), name: 'Klient',
  });

  // 1 + 2: payment-time emails (invoice to the participant + new-participant mail to the instructor)
  await PaymentService.sendWorkshopPaymentEmails(
    {
      userId: client._id, serviceProviderId: instructor._id, workshopId: ws._id, amount: 60,
      transactionId: 'cs_test_1', name: 'Klient',
    },
    'WORKSHOP-1',
  );
  await new Promise((r) => setTimeout(r, 100)); // the new-participant notification is fire-and-forget
  const paymentTime = sentMails.splice(0).map((m) => ({ to: m.to, dates: dates(m.html) }));

  // 3: completion emails
  await WorkshopService.processWorkshopCompletion(ws._id, new Date(afterEnd));
  const completion = sentMails.splice(0).map((m) => ({ to: m.to, dates: dates(m.html) }));

  return { stored, paymentTime, completion };
};

(async () => {
  const results = [];
  for (const c of cases) results.push(await runCase(c));
  console.log(
    'RESULT:' +
      JSON.stringify({
        results,
        todaySlovakia: moment.tz(new Date(), 'Europe/Bratislava').format('DD/MM/YYYY'),
      }),
  );
})();
