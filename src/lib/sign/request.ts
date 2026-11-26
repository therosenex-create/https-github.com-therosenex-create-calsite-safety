import { headers } from "next/headers";
import type { SignContext } from "../services/crew-sign";

export async function signContext(): Promise<SignContext> {
  const incoming = await headers();
  return {
    ip: incoming.get("x-forwarded-for") || incoming.get("x-real-ip"),
    userAgent: incoming.get("user-agent"),
    deviceId: incoming.get("cookie")?.match(/(?:^|;\s*)calsite_device=([^;]+)/)?.[1] ?? null,
  };
}
