import { getActorOrNull } from "@/lib/session";
import { isAppError } from "@/lib/errors";
import { readSignedPdf } from "@/lib/services/crew-sign";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActorOrNull();
  if (!actor) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  try {
    const pdf = await readSignedPdf(actor, id);
    return new Response(Buffer.from(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
        "ETag": pdf.sha256,
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "forbidden") return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
    if (isAppError(error) && error.code === "not_found") return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
