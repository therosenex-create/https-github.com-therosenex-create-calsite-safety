import { getActorOrNull } from "@/lib/session";
import { verifyOrganization } from "@/lib/services/crew-sign";

export async function GET(_request: Request, context: { params: Promise<{ recordId: string }> }) {
  const actor = await getActorOrNull();
  if (!actor) return Response.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (actor.role === "WORKER") return Response.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const { recordId } = await context.params;
  const result = await verifyOrganization(actor.organizationId, recordId);
  return Response.json(
    {
      ok: result.ok,
      recordId,
      reason: result.reason ?? null,
      eventCount: result.eventCount,
      chainEventCount: result.chainEventCount,
      pdfSha256: result.pdf?.sha256 ?? null,
      revision: result.pdf?.revision ?? null,
      fileName: result.pdf?.fileName ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
