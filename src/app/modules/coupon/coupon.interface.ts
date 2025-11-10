export interface ICoupon {
  code: string;
  amount: number;
  limit: number;
  usedCount?: number;
  expiryDate?: Date | null;
  isActive?: boolean;
}
