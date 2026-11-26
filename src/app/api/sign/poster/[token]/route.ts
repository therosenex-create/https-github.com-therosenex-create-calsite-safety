import { getActorOrNull } from "@/lib/session";
import { isAppError } from "@/lib/errors";
import { posterForToken } from "@/lib/services/crew-sign";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const actor = await getActorOrNull();
  if (!actor) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { token } = await context.params;
  const origin = new URL(request.url).origin;
  try {
    const poster = await posterForToken(actor, token, origin);
    return new Response(poster.bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${poster.fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isAppError(error) && (error.code === "token_invalid" || error.code === "not_found")) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    if (isAppError(error) && error.code === "forbidden") return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
    return new Response("Error", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
