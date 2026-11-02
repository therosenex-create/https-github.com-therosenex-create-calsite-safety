import Link from "next/link";
import { notFound } from "next/navigation";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getDocument } from "@/lib/services/work";
import { archiveDocumentAction } from "@/server/actions";

export default async function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const document = await getDocument(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <div>
      <p className="text-sm"><Link href="/app/documents">{t(locale, "nav.files")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{document.title}</h1>
      <p className="text-sm text-muted">{t(locale, `enum.doc.${document.category}`)} · {document.project?.name ?? "—"}</p>
      {document.description ? <p className="mt-3 whitespace-pre-wrap text-sm">{document.description}</p> : null}
      {document.fileName ? (
        <p className="mt-4">
          <a className="btn" href={`/api/documents/${document.id}`}>{t(locale, "actions.download")}</a>
          <span className="ml-2 text-sm text-muted">{document.fileName} · {document.byteSize} bytes</span>
        </p>
      ) : null}
      {actor.role !== "WORKER" && !document.archived ? (
        <form className="mt-6" action={archiveDocumentAction.bind(null, document.id)}>
          <button className="btn-secondary" type="submit">{t(locale, "actions.archive")}</button>
        </form>
      ) : null}
    </div>
  );
}
