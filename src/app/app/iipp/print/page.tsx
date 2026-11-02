import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { PrintFooter } from "@/components/print-footer";
import { readElementSnapshot, type IippElementSnapshot } from "@/lib/iipp-plan";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getIippVault } from "@/lib/services/regulatory";
import { formatDateOnly, formatPacific } from "@/lib/time";

export default async function IippPrint({ searchParams }: { searchParams: Promise<{ revision?: string; source?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const vault = await getIippVault(actor);
  const requested = params.revision ? vault.revisions.find((item) => item.id === params.revision) ?? null : null;
  if (params.revision && !requested) notFound();
  const revision = params.source === "working" ? null : (requested ?? vault.live);
  const elements: IippElementSnapshot[] = revision
    ? readElementSnapshot(revision.elementSnapshot)
    : vault.program.elements.map((element) => ({
        key: element.key,
        sortOrder: element.sortOrder,
        citation: element.citation,
        titleEn: element.titleEn,
        titleEs: element.titleEs,
        userProcedure: element.userProcedure,
        responsibleName: element.responsibleName,
      }));
  const title = revision ? revision.title : vault.program.title;
  const revisionLabel = revision ? revision.revisionLabel : vault.program.revisionLabel;
  const administratorName = revision ? revision.administratorName : vault.program.administratorName;
  const administratorTitle = revision ? revision.administratorTitle : vault.program.administratorTitle;
  const annualReviewOn = revision ? revision.annualReviewOn : vault.program.annualReviewOn;
  const claim = revision ? revision.implementationClaim : vault.program.implementationClaim;
  return (
    <article className="mx-auto max-w-3xl bg-white p-6">
      <PrintButton label={t(locale, "actions.print")} />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wide">{t(locale, "brand")}</p>
      <p className="text-sm">{actor.organizationName}</p>
      <h1 className="mt-2 font-serif text-3xl">{title || t(locale, "iipp.vault")}</h1>
      <p className="mt-2 text-sm">
        {t(locale, "fields.revision")}: {revisionLabel || "—"}
        {" · "}
        {revision ? t(locale, `enum.IippRevisionState.${revision.state}`) : t(locale, "iipp.working")}
      </p>
      <p className="note mt-4">{t(locale, "iipp.cite")}</p>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "iipp.administrator")}</h2>
      <p className="text-sm">
        {administratorName || "—"}
        {administratorTitle ? ` · ${administratorTitle}` : ""}
      </p>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "iipp.annual")}</h2>
      <p className="text-sm">{formatDateOnly(locale, annualReviewOn)}</p>
      {revision?.verifiedAt ? <p className="mt-2 text-sm">{formatPacific(locale, revision.verifiedAt)}</p> : null}
      {claim ? (
        <>
          <h2 className="mt-6 font-serif text-xl">{t(locale, "fields.implementationClaim")}</h2>
          <p className="whitespace-pre-wrap text-sm">{claim}</p>
        </>
      ) : null}
      {elements.map((element) => (
        <section key={element.key} className="mt-6">
          <h2 className="font-serif text-xl">{locale === "es" ? element.titleEs : element.titleEn}</h2>
          <p className="text-sm text-muted">{element.citation}</p>
          {element.responsibleName ? <p className="mt-1 text-sm">{element.responsibleName}</p> : null}
          <p className="mt-2 whitespace-pre-wrap text-sm">{element.userProcedure || "—"}</p>
        </section>
      ))}
      <p className="note mt-6">{t(locale, "iipp.verifiedNote")}</p>
      <PrintFooter locale={locale} demonstration={actor.isDemonstration} />
    </article>
  );
}
