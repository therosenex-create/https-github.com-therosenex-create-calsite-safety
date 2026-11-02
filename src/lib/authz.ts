import type { MembershipRole } from "@prisma/client";
import type { Actor } from "./actor";
import { AppError } from "./errors";

export type Permission =
  | "read"
  | "write_operations"
  | "report_incident"
  | "acknowledge_meeting"
  | "manage_org"
  | "manage_members"
  | "flag_source";

const matrix: Record<Permission, MembershipRole[]> = {
  read: ["ADMIN", "SAFETY_MANAGER", "WORKER"],
  write_operations: ["ADMIN", "SAFETY_MANAGER"],
  report_incident: ["ADMIN", "SAFETY_MANAGER", "WORKER"],
  acknowledge_meeting: ["ADMIN", "SAFETY_MANAGER", "WORKER"],
  manage_org: ["ADMIN"],
  manage_members: ["ADMIN"],
  flag_source: ["ADMIN"],
};

export function assertCan(actor: Actor, permission: Permission) {
  if (!matrix[permission].includes(actor.role)) {
    throw new AppError("forbidden");
  }
}
