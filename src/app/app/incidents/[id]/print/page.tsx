import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { PrintFooter } from "@/components/print-footer";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getIncident } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";

export default async function IncidentPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const incident = await getIncident(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <article className="mx-auto max-w-3xl bg-white p-6">
      <PrintButton label={t(locale, "actions.print")} />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wide">{t(locale, "brand")}</p>
      <h1 className="mt-2 font-serif text-3xl">{t(locale, `enum.IncidentType.${incident.type}`)}</h1>
      <p className="mt-2 text-sm">{formatPacific(locale, incident.occurredAt)} · {incident.project?.name ?? "—"}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm">{incident.description}</p>
      {incident.immediateActions ? <p className="mt-3 whitespace-pre-wrap text-sm">{incident.immediateActions}</p> : null}
      {actor.role !== "WORKER" && incident.investigationNotes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm">{incident.investigationNotes}</p>
      ) : null}
      <PrintFooter locale={locale} demonstration={actor.isDemonstration} />
    </article>
  );
}
