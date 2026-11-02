import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide } from "@/lib/guidance";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const locale = await getLocale();
  return (
    <article className="max-w-3xl">
      <p className="text-sm"><Link href="/app/guidance">{t(locale, "nav.guidance")}</Link></p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber">{t(locale, "common.guidance")}</p>
      <h1 className="mt-2 font-serif text-3xl text-navy">{guide.title[locale]}</h1>
      <p className="note mt-4">{t(locale, "banner")}</p>
      {guide.paragraphs[locale].map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="mt-4 text-sm leading-6">{paragraph}</p>
      ))}
      {guide.requirementCodes.length ? (
        <p className="mt-4 text-sm">Codes: {guide.requirementCodes.join(", ")}</p>
      ) : null}
    </article>
  );
}
