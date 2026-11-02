const EVIDENCE_STATUSES = new Set(["ISSUED", "USER_REPORTED_APPROVAL", "CLOSED"]);

export function permitNeedsEvidence(status: string) {
  return EVIDENCE_STATUSES.has(status);
}

export function permitGaps(permit: {
  permitNumber: string | null;
  appliedOn: Date | null;
  issuedOn?: Date | null;
  documentId: string | null;
  notes: string | null;
  status: string;
  officialUrl: string | null;
}) {
  const gaps: string[] = [];
  if (!permit.permitNumber) gaps.push("number");
  if (!permit.appliedOn) gaps.push("applied_on");
  if (!permit.officialUrl) gaps.push("source_url");
  if (permit.status === "ISSUED" && !permit.issuedOn) gaps.push("issued_on");
  if (permitNeedsEvidence(permit.status)) {
    const noteOk = (permit.notes ?? "").trim().length >= 10;
    if (!noteOk && !permit.documentId) gaps.push("evidence");
  }
  return gaps;
}
