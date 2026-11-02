import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/health/route";
import { logServerEvent } from "../src/lib/log";
import { contentSecurityPolicyFor } from "../src/lib/security-headers";
import { sessionVersionMatches } from "../src/lib/session-version";
import { prisma } from "../src/lib/db";
import { changePassword, revokeSessions } from "../src/lib/services/accounts";
import { acceptContractDraft, createContractDocument, createContractDraft, getContractDocument } from "../src/lib/services/contracts";
import { createPacket, getPacketExport } from "../src/lib/services/packets";
import { createPermit, getPermit } from "../src/lib/services/records";
import { createDocument, createProject } from "../src/lib/services/work";
import { addWorker, createCompany, projectInput } from "./helpers";

describe("phase 7 hardening", () => {
  it("reports database readiness without secrets", async () => {
    const saved = {
      GIT_SHA: process.env.GIT_SHA,
      COMMIT_REF: process.env.COMMIT_REF,
      APP_VERSION: process.env.APP_VERSION,
    };
    delete process.env.GIT_SHA;
    delete process.env.COMMIT_REF;
    delete process.env.APP_VERSION;
    try {
      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({ ok: true, db: "up", version: null });
      expect(JSON.stringify(body)).not.toMatch(/postgres|secret|password/i);
      expect(response.headers.get("cache-control")).toBe("no-store");
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("keeps the script nonce path free of unsafe-inline", () => {
    const policy = contentSecurityPolicyFor("abc");
    const script = policy.split("; ").find((part) => part.startsWith("script-src"));
    expect(script).toContain("'nonce-abc'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toContain("contentSecurityPolicyFor(nonce)");
    expect(middleware).not.toContain("unsafe-inline");
  });

  it("redacts auth-failure fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logServerEvent("auth_failed", { email: "ada@example.com", password: "Correct-Horse-1" });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain("a***@example.com");
    expect(line).not.toContain("Correct-Horse-1");
    expect(line).not.toContain("ada@example.com");
    spy.mockRestore();
  });

  it("denies another company access to contracts, packets, and permits", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const project = await createProject(admin, projectInput());
    const file = await createDocument(
      admin,
      { projectId: project.id, title: "Clause", category: "other", description: "" },
      { name: "clause.txt", mimeType: "text/plain", bytes: Buffer.from("typed clause") },
    );
    const contract = await createContractDocument(admin, {
      projectId: project.id,
      documentId: file.id,
      docType: "SUBCONTRACT",
      title: "Excerpt",
      parties: "Owner and builder",
      effectiveOn: "",
      receivedOn: "",
      revisionLabel: "",
      notes: "",
    });
    await expect(getContractDocument(other, contract.id)).rejects.toMatchObject({ code: "not_found" });
    const packet = await createPacket(admin, {
      projectId: project.id,
      title: "File",
      purposeNote: "Company packet for this test only.",
    });
    await expect(getPacketExport(other, packet.id)).rejects.toMatchObject({ code: "not_found" });
    const permit = await createPermit(admin, {
      projectId: project.id,
      authorityName: "Counter",
      jurisdictionLabel: "Oakland",
      permitType: "Building",
      permitNumber: "",
      status: "UNKNOWN",
      appliedOn: "",
      notes: "",
      officialUrl: "",
    });
    await expect(getPermit(other, permit.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("still invalidates the stored session version and blocks a worker from accepting a contract", async () => {
    const admin = await createCompany();
    const worker = await addWorker(admin);
    expect(sessionVersionMatches(0, 0)).toBe(true);
    await revokeSessions(admin, admin.userId);
    const revoked = await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } });
    expect(sessionVersionMatches(0, revoked.sessionVersion)).toBe(false);
    await changePassword(admin, {
      currentPassword: "Correct-Horse-1",
      password: "Correct-Horse-9",
      confirmPassword: "Correct-Horse-9",
    });
    const changed = await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } });
    expect(changed.sessionVersion).toBe(revoked.sessionVersion + 1);
    const project = await createProject(admin, projectInput());
    const file = await createDocument(
      admin,
      { projectId: project.id, title: "Clause", category: "other", description: "" },
      { name: "clause.txt", mimeType: "text/plain", bytes: Buffer.from("typed clause") },
    );
    const contract = await createContractDocument(admin, {
      projectId: project.id,
      documentId: file.id,
      docType: "OTHER",
      title: "Note",
      parties: "Owner and builder",
      effectiveOn: "",
      receivedOn: "",
      revisionLabel: "",
      notes: "",
    });
    const draft = await createContractDraft(admin, {
      contractDocumentId: contract.id,
      clauseReference: "Typed clause",
      quote: "A person typed this sentence into the draft.",
      requirementId: "",
    });
    await expect(
      acceptContractDraft(worker, { draftId: draft.id, reason: "A worker must not accept this draft.", dueOn: "" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(await prisma.contractDraft.findUniqueOrThrow({ where: { id: draft.id } })).toMatchObject({ status: "DRAFT" });
  });
});
