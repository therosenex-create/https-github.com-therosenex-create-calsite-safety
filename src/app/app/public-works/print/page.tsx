import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { PrintFooter } from "@/components/print-footer";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getCloseout } from "@/lib/services/local";

export default async function CloseoutPrint({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  if (!params.project) notFound();
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const items = await getCloseout(actor, params.project).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <article className="mx-auto max-w-3xl bg-white p-6">
      <PrintButton label={t(locale, "actions.print")} />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wide">{t(locale, "brand")}</p>
      <h1 className="mt-2 font-serif text-3xl">{t(locale, "nav.publicWorks")}</h1>
      <p className="note mt-4">{t(locale, "closeout.intro")}</p>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.key}>
            <p className="font-semibold">{t(locale, `enum.Closeout.${item.key}`)} · {item.complete ? t(locale, "yes") : t(locale, "no")}</p>
            {item.note ? <p className="whitespace-pre-wrap">{item.note}</p> : null}
            {item.key === "PAYROLL_DRAFTS" ? <p>{item.draftCount}</p> : null}
            {item.key === "SIGNOFF" && item.signoffName ? <p>{item.signoffName} · {t(locale, "closeout.notSignature")}</p> : null}
          </li>
        ))}
      </ul>
      <PrintFooter locale={locale} demonstration={actor.isDemonstration} />
    </article>
  );
}
