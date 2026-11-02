import type { MembershipRole } from "@prisma/client";

export type Actor = {
  userId: string;
  organizationId: string;
  role: MembershipRole;
  email: string;
  name: string;
  organizationName: string;
  isDemonstration: boolean;
};
