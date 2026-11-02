import Link from "next/link";
import { PageHeader } from "@/components/fields";
import { GUIDES } from "@/lib/guidance";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function GuidancePage() {
  const locale = await getLocale();
  return (
    <div>
      <PageHeader title={t(locale, "nav.guidance")} subtitle={t(locale, "banner")} />
      <ul className="space-y-3">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/guidance/${guide.slug}`}>{guide.title[locale]}</Link>
            <p className="mt-1 text-sm text-muted">{guide.summary[locale]}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
