export const USER_ROLE = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  USER: 'user',
  COMPANY: 'company',
  PHOTOGRAPHER: 'photographer',
  VIDEOGRAPHER: 'videographer',
  BOTH: "both",
  GUEST: 'guest'
} as const;

export const ADMIN_ROUTE_OPTIONS = [
  "all",
  "users-management",
  "approvals",
  "order-management",
  "delivery-management",
  "gear-marketplace",
  "package-management",
  "workshop-management",
  "community-forum-management",
  "earning",
  "categories",
  "towns",
  "reports",
  "messages",
  "commission-setup",
  "coupon",
  "feedback",
  "frafol-choice",
  "newsletter",
  "interaction-management",
  "documentation",
  "admin-management",
] as const;

export type AdminRouteOption = typeof ADMIN_ROUTE_OPTIONS[number];

export const gender = ['Male', 'Female', 'Others'] as const;
export const Role = Object.values(USER_ROLE);

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];