import Link from "next/link";
import { PageHeader } from "@/components/fields";
import { COVERAGE_GAPS } from "@/lib/coverage-gaps";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { listRequirements, listSources } from "@/lib/services/regulatory";

export default async function RegulatoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const locale = await getLocale();
  const [sources, requirements] = await Promise.all([listSources(params.q), listRequirements(params.q)]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.requirements")} subtitle={t(locale, "banner")} />
      <form className="mb-6 flex gap-2">
        <input className="input mt-0" name="q" defaultValue={params.q ?? ""} aria-label={t(locale, "actions.search")} />
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
              <p className="text-sm text-muted">{requirement.code} · {t(locale, `enum.ReviewStatus.${requirement.reviewStatus}`)}</p>
              <p className="mt-2 text-sm">{locale === "es" ? requirement.plainLanguageEs : requirement.plainLanguageEn}</p>
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
