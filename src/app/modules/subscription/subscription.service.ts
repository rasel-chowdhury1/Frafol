import { Subscription } from "./subscription.model";
import { DEFAULT_SUBSCRIPTIONS } from "./subscription.constant";

const ensureDefaultSubscriptions = async () => {
  const count = await Subscription.countDocuments();

  if (count === 0) {
    await Subscription.insertMany(DEFAULT_SUBSCRIPTIONS);
  }
};

const getAllSubscriptions = async () => {
  await ensureDefaultSubscriptions();
  return await Subscription.find({ isActive: true }).sort({ duration: 1 });
};

const updateSubscriptionPrice = async (id: string, price: number) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");

  subscription.price = price;
  await subscription.save();

  return subscription;
};

export const SubscriptionService = {
  getAllSubscriptions,
  updateSubscriptionPrice,
};
