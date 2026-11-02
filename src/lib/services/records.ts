import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { PARTIALLY_READ_CODES } from "../review-queue";
import { citySourceSchema, parseInput, permitSchema, reviewSchema } from "../validation";
import { audit } from "./common";

export async function listReviewQueue(actor: Actor) {
  const requirements = await prisma.regulatoryRequirement.findMany({
    where: { code: { in: [...PARTIALLY_READ_CODES] } },
    orderBy: { citation: "asc" },
    include: {
      reviews: {
        where: { organizationId: actor.organizationId },
        orderBy: { reviewedAt: "desc" },
        take: 1,
      },
    },
  });
  return requirements;
}

export async function recordQualifiedReview(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(reviewSchema, input);
  const requirement = await prisma.regulatoryRequirement.findUnique({ where: { id: data.requirementId } });
  if (!requirement) throw new AppError("not_found");
  if (!PARTIALLY_READ_CODES.includes(requirement.code as (typeof PARTIALLY_READ_CODES)[number])) {
    throw new AppError("invalid");
  }
  const before = requirement.plainLanguageEn;
  const review = await prisma.regulatoryReview.create({
    data: {
      organizationId: actor.organizationId,
      requirementId: requirement.id,
      reviewerUserId: actor.userId,
      decision: data.decision,
      note: data.note,
      reviewedAt: new Date(),
      acknowledgedNotCertification: true,
    },
  });
  const after = await prisma.regulatoryRequirement.findUniqueOrThrow({ where: { id: requirement.id } });
  if (after.plainLanguageEn !== before || after.reviewStatus !== requirement.reviewStatus) {
    throw new AppError("invalid");
  }
  await audit(prisma, actor, "record_qualified_review", "RegulatoryReview", review.id, {
    decision: review.decision,
    code: requirement.code,
  });
  return review;
}

export async function createPermit(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(permitSchema, input);
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId: actor.organizationId },
  });
  if (!project) throw new AppError("not_found");
  const permit = await prisma.permitRecord.create({
    data: {
      organizationId: actor.organizationId,
      projectId: project.id,
      authorityName: data.authorityName,
      jurisdictionLabel: data.jurisdictionLabel,
      permitType: data.permitType,
      permitNumber: data.permitNumber,
      status: data.status,
      appliedOn: data.appliedOn,
      notes: data.notes,
      officialUrl: data.officialUrl,
      sourceReviewStatus: "UNREVIEWED",
      createdById: actor.userId,
    },
  });
  await audit(prisma, actor, "create_permit", "PermitRecord", permit.id, { status: permit.status });
  return permit;
}

export async function listPermits(actor: Actor) {
  return prisma.permitRecord.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { name: true } } },
    take: 100,
  });
}

export async function createCitySource(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(citySourceSchema, input);
  const before = await prisma.regulatoryRequirement.count();
  const source = await prisma.citySource.create({
    data: {
      organizationId: actor.organizationId,
      cityName: data.cityName,
      countyName: data.countyName,
      subject: data.subject,
      officialUrl: data.officialUrl,
      notes: data.notes,
      reviewStatus: "UNREVIEWED",
      createdById: actor.userId,
    },
  });
  const after = await prisma.regulatoryRequirement.count();
  if (after !== before) throw new AppError("invalid");
  await audit(prisma, actor, "create_city_source", "CitySource", source.id, {});
  return source;
}

export async function listCitySources(actor: Actor) {
  return prisma.citySource.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
