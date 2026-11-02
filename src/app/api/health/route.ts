import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function publicVersion() {
  const raw = (process.env.GIT_SHA || process.env.COMMIT_REF || process.env.APP_VERSION || "").trim().slice(0, 64);
  if (!/^[A-Za-z0-9._-]+$/.test(raw)) return null;
  return raw;
}

export async function GET() {
  let db: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }
  return Response.json(
    { ok: db === "up", db, version: publicVersion() },
    { status: db === "up" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
