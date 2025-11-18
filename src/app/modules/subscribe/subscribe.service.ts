import { Subscribe } from "./subscribe.model";
import { ISubscribe } from "./subscribe.interface";
import crypto from "crypto";
import AppError from "../../error/AppError";
import QueryBuilder from "../../builder/QueryBuilder";

const subscribeByEmail = async (email: string): Promise<ISubscribe> => {
  // Check existing
  const existing = await Subscribe.findOne({ email });

  if (existing) {
    throw new AppError(400, "This email is already subscribed");
  }

  // Create verification token
  const token = crypto.randomBytes(32).toString("hex");

  const subscription = await Subscribe.create({
    email,
    verificationToken: token,
  });

  // TODO: send email

  return subscription;
};

const verifySubscription = async (token: string): Promise<string> => {
  const subscriber = await Subscribe.findOne({ verificationToken: token });

  if (!subscriber) {
    throw new AppError(400, "Invalid or expired verification token");
  }

  subscriber.isVerified = true;
  subscriber.verificationToken = null;

  await subscriber.save();

  return "Subscription verified successfully";
};

const getAllSubscribers = async (query: any) => {
  // Start with a base query
  const baseQuery = Subscribe.find();

  // Build the query using QueryBuilder
  const qb = new QueryBuilder(baseQuery, query)
    .search(["email"]) // allow searching by email
    .filter()          // for any filter params
    .sort()            // sorting
    .paginate()        // pagination
    .fields();         // select specific fields if requested

  // Execute the query
  const subscribers = await qb.modelQuery;

  // Get total count (for pagination metadata)
  const meta = await qb.countTotal();

  return { meta, subscribers };
};

export const SubscribeService = {
  subscribeByEmail,
  verifySubscription,
  getAllSubscribers,
};
