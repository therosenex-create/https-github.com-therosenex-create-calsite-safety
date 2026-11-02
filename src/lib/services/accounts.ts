import { Prisma } from "@prisma/client";
import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { logServerEvent } from "../log";
import { IIPP_ELEMENTS } from "../iipp-template";
import { isLoginLimited, loginWindowStart } from "../rate-limit";
import { hashPassword, verifyPassword } from "../password";
import {
  inviteSchema,
  licenseCheckSchema,
  orgSchema,
  parseInput,
  passwordChangeSchema,
  passwordSchema,
  registerSchema,
} from "../validation";
import { audit, slugify } from "./common";

async function createDefaultIipp(tx: Prisma.TransactionClient, organizationId: string) {
  const program = await tx.iippProgram.create({
    data: { organizationId, status: "TEMPLATE" },
  });
  await tx.iippElement.createMany({
    data: IIPP_ELEMENTS.map((element) => ({
      programId: program.id,
      sortOrder: element.sortOrder,
      key: element.key,
      citation: element.citation,
      titleEn: element.titleEn,
      titleEs: element.titleEs,
    })),
  });
}

export async function registerCompany(input: unknown) {
  const data = parseInput(registerSchema, input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("email_taken");
  const passwordHash = await hashPassword(data.password);
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, name: data.name, passwordHash },
      });
      const organization = await tx.organization.create({
        data: { name: data.companyName, legalName: data.companyName, slug: slugify(data.companyName) },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "ADMIN" },
      });
      await createDefaultIipp(tx, organization.id);
      const actor: Actor = {
        userId: user.id,
        organizationId: organization.id,
        role: "ADMIN",
        email: user.email,
        name: user.name,
        organizationName: organization.name,
        isDemonstration: false,
      };
      await audit(tx, actor, "register_company", "Organization", organization.id, {});
      return actor;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("email_taken");
    }
    throw error;
  }
}

async function recentFailures(email: string) {
  return prisma.loginAttempt.count({
    where: { email, success: false, attemptedAt: { gte: loginWindowStart() } },
  });
}

export async function enforceLoginRateLimit(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const failures = await recentFailures(normalized);
  if (isLoginLimited(failures)) throw new AppError("rate_limited");
}

async function recordLoginAttempt(email: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { email, success } });
}

export async function authenticate(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  await enforceLoginRateLimit(normalized);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    await hashPassword(password);
    await recordLoginAttempt(normalized, false);
    logServerEvent("auth_failed", { email: normalized });
    return null;
  }
  const matches = await verifyPassword(password, user.passwordHash);
  await recordLoginAttempt(normalized, matches);
  if (!matches) {
    logServerEvent("auth_failed", { email: normalized });
    return null;
  }
  return user;
}

export async function inviteMember(actor: Actor, input: unknown) {
  assertCan(actor, "manage_members");
  const data = parseInput(inviteSchema, input);
  const passwordHash = await hashPassword(data.password);
  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: data.email } });
    if (!user) {
      user = await tx.user.create({
        data: { email: data.email, name: data.name, passwordHash },
      });
    }
    const existing = await tx.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: actor.organizationId } },
    });
    if (existing) throw new AppError("email_taken");
    const membership = await tx.membership.create({
      data: { userId: user.id, organizationId: actor.organizationId, role: data.role },
    });
    await audit(tx, actor, "invite_member", "Membership", membership.id, { role: data.role });
    return membership;
  });
}

export async function updateMemberRole(actor: Actor, membershipId: string, role: "ADMIN" | "SAFETY_MANAGER" | "WORKER") {
  assertCan(actor, "manage_members");
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: actor.organizationId },
  });
  if (!membership) throw new AppError("not_found");
  if (membership.role === "ADMIN" && role !== "ADMIN") {
    const admins = await prisma.membership.count({
      where: { organizationId: actor.organizationId, role: "ADMIN" },
    });
    if (admins <= 1) throw new AppError("last_admin");
  }
  const updated = await prisma.membership.update({ where: { id: membership.id }, data: { role } });
  await audit(prisma, actor, "update_role", "Membership", membership.id, { role });
  return updated;
}

export async function changePassword(actor: Actor, input: unknown) {
  const data = parseInput(passwordChangeSchema, input);
  const user = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!user) throw new AppError("not_found");
  const matches = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!matches) throw new AppError("current_password");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(data.password), sessionVersion: { increment: 1 } },
  });
  await audit(prisma, actor, "change_password", "User", user.id, {});
}

export async function adminSetPassword(actor: Actor, userId: string, password: string) {
  assertCan(actor, "manage_members");
  const parsed = parseInput(passwordSchema, password);
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId: actor.organizationId },
  });
  if (!membership) throw new AppError("not_found");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed), sessionVersion: { increment: 1 } },
  });
  await audit(prisma, actor, "admin_set_password", "User", userId, {});
}

export async function revokeSessions(actor: Actor, userId: string) {
  if (actor.userId !== userId) {
    assertCan(actor, "manage_members");
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: actor.organizationId },
    });
    if (!membership) throw new AppError("not_found");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await audit(prisma, actor, "revoke_sessions", "User", userId, {});
}

export async function updateOrganization(actor: Actor, input: unknown) {
  assertCan(actor, "manage_org");
  const data = parseInput(orgSchema, input);
  const current = await prisma.organization.findUnique({ where: { id: actor.organizationId } });
  if (!current) throw new AppError("not_found");
  const licenseChanged =
    (data.cslbLicenseNumber ?? null) !== current.cslbLicenseNumber ||
    (data.cslbClassification ?? null) !== current.cslbClassification;
  const dirChanged = (data.dirRegistrationNumber ?? null) !== current.dirRegistrationNumber;
  const updated = await prisma.organization.update({
    where: { id: current.id },
    data: {
      name: data.name,
      legalName: data.legalName,
      dba: data.dba,
      mailingCity: data.mailingCity,
      mailingState: data.mailingState ? data.mailingState.toUpperCase() : null,
      cslbLicenseNumber: data.cslbLicenseNumber,
      cslbClassification: data.cslbClassification,
      dirRegistrationNumber: data.dirRegistrationNumber,
      ...(licenseChanged ? { cslbVerificationStatus: "VERIFICATION_REQUIRED" } : {}),
      ...(dirChanged ? { dirVerificationStatus: "VERIFICATION_REQUIRED" } : {}),
    },
  });
  await audit(prisma, actor, "update_organization", "Organization", updated.id, {
    licenseReset: licenseChanged,
    dirReset: dirChanged,
  });
  return updated;
}

export async function recordLicenseCheck(actor: Actor, input: unknown) {
  assertCan(actor, "manage_org");
  const data = parseInput(licenseCheckSchema, input);
  if (data.documentId) {
    const document = await prisma.safetyDocument.findFirst({
      where: { id: data.documentId, organizationId: actor.organizationId },
    });
    if (!document) throw new AppError("not_found");
  }
  return prisma.$transaction(async (tx) => {
    const check = await tx.licenseCheck.create({
      data: {
        organizationId: actor.organizationId,
        kind: data.kind,
        status: data.status,
        note: data.note,
        checkedAt: new Date(),
        recordedById: actor.userId,
        documentId: data.documentId,
      },
    });
    if (data.kind === "CSLB") {
      await tx.organization.update({
        where: { id: actor.organizationId },
        data: { cslbVerificationStatus: data.status },
      });
    } else {
      await tx.organization.update({
        where: { id: actor.organizationId },
        data: { dirVerificationStatus: data.status },
      });
    }
    await audit(tx, actor, "record_license_check", "LicenseCheck", check.id, {
      kind: data.kind,
      status: data.status,
    });
    return check;
  });
}

export async function listMembers(actor: Actor) {
  return prisma.membership.findMany({
    where: { organizationId: actor.organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrganization(actor: Actor) {
  const organization = await prisma.organization.findUnique({ where: { id: actor.organizationId } });
  if (!organization) throw new AppError("not_found");
  const checks = await prisma.licenseCheck.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { checkedAt: "desc" },
    take: 8,
  });
  return { organization, checks };
}
