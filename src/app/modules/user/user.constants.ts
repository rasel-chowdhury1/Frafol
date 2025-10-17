export const USER_ROLE = {
  ADMIN: 'admin',
  USER: 'user',
  COMPANY: 'company',
  PHOTOGRAPHER: 'photographer',
  VIDEOGRAPHER: 'videographer',
  BOTH: "both"
} as const;

export const gender = ['Male', 'Female', 'Others'] as const;
export const Role = Object.values(USER_ROLE);

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];