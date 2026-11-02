import Link from "next/link";
import { EnumOptions, PageHeader, SelectField } from "@/components/fields";
import { COVERAGE_GAPS } from "@/lib/coverage-gaps";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listJurisdictions, listSources, searchCatalog } from "@/lib/services/regulatory";

const reviews = ["UNREVIEWED", "PENDING_QUALIFIED_REVIEW", "SOURCE_LINKED", "NEEDS_UPDATE", "RETIRED"] as const;
const applicability = ["APPLICABLE", "POTENTIALLY_APPLICABLE", "NOT_APPLICABLE", "CONTRACTUALLY_REQUIRED", "RECOMMENDED_PRACTICE", "PENDING_QUALIFIED_REVIEW", "SUPERSEDED", "VERIFICATION_OVERDUE"] as const;

export default async function RegulatoryPage({ searchParams }: { searchParams: Promise<{ q?: string; reviewStatus?: string; jurisdiction?: string; applicability?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [sources, requirements, jurisdictions] = await Promise.all([
    listSources(params.q),
    searchCatalog(actor, params),
    listJurisdictions(),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.requirements")} subtitle={t(locale, "banner")} />
      <form className="mb-6 grid gap-3 md:grid-cols-2">
        <input className="input mt-0" name="q" defaultValue={params.q ?? ""} aria-label={t(locale, "actions.search")} />
        <SelectField label={t(locale, "search.review")} name="reviewStatus" defaultValue={params.reviewStatus ?? ""}>
          <option value="">—</option>
          <EnumOptions locale={locale} group="ReviewStatus" values={reviews} />
        </SelectField>
        <SelectField label={t(locale, "search.jurisdiction")} name="jurisdiction" defaultValue={params.jurisdiction ?? ""}>
          <option value="">—</option>
          {jurisdictions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </SelectField>
        <SelectField label={t(locale, "search.applicability")} name="applicability" defaultValue={params.applicability ?? ""}>
          <option value="">—</option>
          <EnumOptions locale={locale} group="ApplicabilityState" values={applicability} />
        </SelectField>
        <button className="btn" type="submit">{t(locale, "actions.search")}</button>
      </form>
      <section>
        <h2 className="font-serif text-2xl text-navy">{t(locale, "section.gaps")}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
          {COVERAGE_GAPS.map((gap) => <li key={gap.en}>{locale === "es" ? gap.es : gap.en}</li>)}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "section.catalog")}</h2>
        <ul className="mt-3 space-y-3">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="card">
              <Link className="font-semibold text-navy underline" href={`/app/regulatory/requirements/${requirement.id}`}>{requirement.citation} — {requirement.title}</Link>
              <p className="text-sm text-muted">{requirement.code} · {requirement.jurisdictionName} · {t(locale, `enum.ReviewStatus.${requirement.reviewStatus}`)}</p>
              <p className="mt-2 text-sm"><a className="underline" href={requirement.officialUrl}>{requirement.officialUrl}</a></p>
              <p className="mt-2 text-sm">{requirement.limitations}</p>
              <p className="mt-2 text-sm"><span className="font-semibold">{t(locale, "search.guidanceLabel")}. </span>{locale === "es" ? requirement.guidance.es : requirement.guidance.en}</p>
              {requirement.companyNote ? <p className="mt-2 text-sm">{t(locale, "search.companyNote")}: {requirement.companyNote}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "section.sources")}</h2>
        <ul className="mt-3 space-y-3">
          {sources.map((source) => (
            <li key={source.id} className="card">
              <Link className="font-semibold text-navy underline" href={`/app/regulatory/sources/${source.id}`}>{source.title}</Link>
              <p className="text-sm text-muted">{source.agency.abbreviation} · {t(locale, `enum.DocumentKind.${source.documentKind}`)} · {t(locale, `enum.RetrievalStatus.${source.retrievalStatus}`)}</p>
              <p className="text-sm">{source.isBinding ? t(locale, "meta.binding") : t(locale, "meta.notBinding")}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
