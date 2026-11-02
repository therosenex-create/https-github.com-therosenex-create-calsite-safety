import { getActorOrNull } from "@/lib/session";
import { readDocumentFile } from "@/lib/services/work";
import { isAppError } from "@/lib/errors";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActorOrNull();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  try {
    const document = await readDocumentFile(actor, id);
    const bytes = new Uint8Array(Buffer.from(document.contentBytes!));
    return new Response(bytes, {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") return new Response("Not found", { status: 404 });
    return new Response("Error", { status: 500 });
  }
}
