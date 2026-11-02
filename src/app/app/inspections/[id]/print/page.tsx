import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { PrintFooter } from "@/components/print-footer";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getInspection } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";

export default async function InspectionPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const inspection = await getInspection(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <article className="mx-auto max-w-3xl bg-white p-6">
      <PrintButton label={t(locale, "actions.print")} />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wide">{t(locale, "brand")}</p>
      <h1 className="mt-2 font-serif text-3xl">{t(locale, `enum.category.${inspection.category}`)}</h1>
      <p className="mt-2 text-sm">{formatPacific(locale, inspection.inspectedAt)} · {inspection.inspectorName}</p>
      <p className="text-sm">{inspection.project.name}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm">{inspection.summary}</p>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "nav.inspections")}</h2>
      <ul className="mt-2 space-y-3 text-sm">
        {inspection.findings.map((finding) => (
          <li key={finding.id}>
            <p className="font-semibold">{finding.description}</p>
            <ul className="mt-1 list-disc pl-5">
              {finding.correctiveActions.map((action) => (
                <li key={action.id}>{action.description} · {t(locale, `enum.ActionStatus.${action.status}`)} · {action.responsibleName}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <PrintFooter locale={locale} demonstration={actor.isDemonstration} />
    </article>
  );
}
