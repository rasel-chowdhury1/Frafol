export interface ICoupon {
  code: string;
  minimumSpend: number;
  amount: number;
  limit: number;
  usedCount: number;
  expiryDate?: Date | null;
  isActive?: boolean;
}
