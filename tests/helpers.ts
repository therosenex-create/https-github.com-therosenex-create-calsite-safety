import type { Actor } from "../src/lib/actor";
import { inviteMember, registerCompany } from "../src/lib/services/accounts";

let sequence = 0;

export async function createCompany(name = "Test Builders"): Promise<Actor> {
  sequence += 1;
  return registerCompany({
    companyName: name,
    name: "Ada Admin",
    email: `ada-${sequence}-${Date.now()}@example.com`,
    password: "Correct-Horse-1",
    confirmPassword: "Correct-Horse-1",
  });
}

export async function addWorker(admin: Actor, email = `worker-${Date.now()}@example.com`): Promise<Actor> {
  const membership = await inviteMember(admin, {
    name: "Wes Worker",
    email,
    password: "Correct-Horse-2",
    role: "WORKER",
  });
  return {
    userId: membership.userId,
    organizationId: admin.organizationId,
    role: "WORKER",
    email,
    name: "Wes Worker",
    organizationName: admin.organizationName,
    isDemonstration: false,
  };
}

export function projectInput(overrides: Record<string, string> = {}) {
  return {
    name: "Market Street TI",
    jobsiteName: "Market",
    streetAddress: "100 Market Street",
    city: "San Francisco",
    county: "San Francisco",
    state: "CA",
    postalCode: "94105",
    ownerType: "PRIVATE",
    ownerName: "Demo Owner",
    publicWorksStatus: "UNKNOWN",
    publicWorksRationale: "",
    description: "Tenant improvement",
    scopeOfWork: "Interior build-out",
    status: "ACTIVE",
    startDate: "2026-11-02",
    endDate: "",
    jurisdictionConfirmed: "no",
    ...overrides,
  };
}
