import { describe, expect, it } from "vitest";
import { pacificLocalToUtc, utcToPacificInput } from "../src/lib/time";

describe("Pacific Time", () => {
  it("converts a winter local time to UTC", () => {
    const utc = pacificLocalToUtc("2026-11-02T15:30");
    expect(utc.toISOString()).toBe("2026-11-02T23:30:00.000Z");
    expect(utcToPacificInput(utc)).toBe("2026-11-02T15:30");
  });

  it("converts a summer local time to UTC", () => {
    const utc = pacificLocalToUtc("2026-07-15T15:30");
    expect(utc.toISOString()).toBe("2026-07-15T22:30:00.000Z");
  });
});
