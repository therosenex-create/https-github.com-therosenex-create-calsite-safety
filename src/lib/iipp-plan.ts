import type { IippElement, IippProgram, IippRevision, Prisma } from "@prisma/client";

export const IIPP_CORE_KEYS = ["hazard_id", "investigation", "correction", "training"] as const;

export type IippElementSnapshot = {
  key: string;
  sortOrder: number;
  citation: string;
  titleEn: string;
  titleEs: string;
  userProcedure: string | null;
  responsibleName: string | null;
};

export type PlanShape = {
  title: string;
  revisionLabel: string;
  administratorName: string | null;
  administratorTitle: string | null;
  annualReviewOn: string | null;
  implementationClaim: string | null;
  elements: { key: string; userProcedure: string | null; responsibleName: string | null }[];
};

export function readElementSnapshot(value: Prisma.JsonValue): IippElementSnapshot[] {
  if (!Array.isArray(value)) return [];
  const rows: IippElementSnapshot[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, Prisma.JsonValue | undefined>;
    if (typeof row.key !== "string") continue;
    rows.push({
      key: row.key,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
      citation: typeof row.citation === "string" ? row.citation : "",
      titleEn: typeof row.titleEn === "string" ? row.titleEn : row.key,
      titleEs: typeof row.titleEs === "string" ? row.titleEs : row.key,
      userProcedure: typeof row.userProcedure === "string" ? row.userProcedure : null,
      responsibleName: typeof row.responsibleName === "string" ? row.responsibleName : null,
    });
  }
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function snapshotElements(elements: IippElement[]): Prisma.InputJsonValue {
  return elements
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((element) => ({
      key: element.key,
      sortOrder: element.sortOrder,
      citation: element.citation,
      titleEn: element.titleEn,
      titleEs: element.titleEs,
      userProcedure: element.userProcedure,
      responsibleName: element.responsibleName,
    }));
}

function elementShape(elements: { key: string; userProcedure: string | null; responsibleName: string | null; sortOrder?: number }[]) {
  return elements
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.key.localeCompare(b.key))
    .map((element) => ({
      key: element.key,
      userProcedure: element.userProcedure,
      responsibleName: element.responsibleName,
    }));
}

export function programShape(program: IippProgram & { elements: IippElement[] }): PlanShape {
  return {
    title: program.title,
    revisionLabel: program.revisionLabel,
    administratorName: program.administratorName,
    administratorTitle: program.administratorTitle,
    annualReviewOn: program.annualReviewOn ? program.annualReviewOn.toISOString() : null,
    implementationClaim: program.implementationClaim,
    elements: elementShape(program.elements),
  };
}

export function revisionShape(revision: IippRevision): PlanShape {
  const elements = readElementSnapshot(revision.elementSnapshot);
  return {
    title: revision.title,
    revisionLabel: revision.revisionLabel,
    administratorName: revision.administratorName,
    administratorTitle: revision.administratorTitle,
    annualReviewOn: revision.annualReviewOn ? revision.annualReviewOn.toISOString() : null,
    implementationClaim: revision.implementationClaim,
    elements: elementShape(elements),
  };
}

export function samePlan(left: PlanShape, right: PlanShape) {
  return JSON.stringify(left) === JSON.stringify(right);
}
