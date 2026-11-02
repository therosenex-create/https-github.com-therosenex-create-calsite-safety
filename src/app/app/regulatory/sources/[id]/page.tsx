import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { TextArea } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getSource } from "@/lib/services/regulatory";
import { formatDateOnly } from "@/lib/time";
import { flagSourceAction } from "@/server/actions";

export default async function SourceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const source = await getSource(id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <div className="space-y-4">
      <p className="text-sm"><Link href="/app/regulatory">{t(locale, "nav.requirements")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{source.title}</h1>
      <p className="text-sm">{source.agency.name} · {source.jurisdiction.name}</p>
      <p><a className="underline" href={source.officialUrl}>{source.officialUrl}</a></p>
      <dl className="card grid gap-2 text-sm">
        <div><dt className="font-semibold">{t(locale, "fields.category")}</dt><dd>{t(locale, `enum.DocumentKind.${source.documentKind}`)}</dd></div>
        <div><dt className="font-semibold">{t(locale, "fields.status")}</dt><dd>{t(locale, `enum.ReviewStatus.${source.reviewStatus}`)} · {t(locale, `enum.RetrievalStatus.${source.retrievalStatus}`)}</dd></div>
        <div><dt className="font-semibold">Checked</dt><dd>{formatDateOnly(locale, source.retrievedAt)}</dd></div>
        <div><dd>{source.isBinding ? t(locale, "meta.binding") : t(locale, "meta.notBinding")}</dd></div>
        <div><dd>{t(locale, "meta.retrievalOff")}</dd></div>
      </dl>
      <p className="note">{source.limitations}</p>
      <section>
        <h2 className="font-serif text-2xl">Requirements from this source</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {source.requirements.map((requirement) => (
            <li key={requirement.id}><Link className="underline" href={`/app/regulatory/requirements/${requirement.id}`}>{requirement.citation}</Link></li>
          ))}
          {source.requirements.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Review flags</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {source.changes.map((change) => (
            <li key={change.id} className="card">{formatDateOnly(locale, change.detectedAt)} · {change.summary}</li>
          ))}
          {source.changes.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
        </ul>
        {actor.role === "ADMIN" ? (
          <div className="mt-4">
            <ActionForm action={flagSourceAction.bind(null, source.id)} submitLabel={t(locale, "actions.flagReview")}>
              <TextArea label={t(locale, "fields.note")} name="note" required hint={t(locale, "meta.retrievalOff")} />
            </ActionForm>
          </div>
        ) : null}
      </section>
    </div>
  );
}
