import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { PrintFooter } from "@/components/print-footer";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getPacketExport } from "@/lib/services/packets";
import { formatPacific } from "@/lib/time";

export default async function PacketPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const view = await getPacketExport(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <article className="mx-auto max-w-3xl bg-white p-6">
      <PrintButton label={t(locale, "actions.print")} />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wide">{t(locale, "brand")}</p>
      <h1 className="mt-2 font-serif text-3xl">{view.packet.title}</h1>
      <p className="mt-2 text-sm">{formatPacific(locale, view.packet.createdAt)} · {view.packet.project?.name ?? "—"}</p>
      <p className="note mt-4">{t(locale, "packet.intro")}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm">{view.packet.purposeNote}</p>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "nav.packets")}</h2>
      <ul className="mt-2 space-y-3 text-sm">
        {view.included.map((item) => (
          <li key={`${item.kind}-${item.recordId}`}>
            <p className="font-semibold">{t(locale, `enum.PacketKind.${item.kind}`)} · {item.label}</p>
            {item.state === "included" ? <p className="whitespace-pre-wrap">{item.detail}</p> : null}
            {item.state === "withheld" ? <p>{t(locale, "packet.withheld")}</p> : null}
            {item.state === "missing" ? <p>{t(locale, "packet.gone")}</p> : null}
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "packet.missing")}</h2>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {view.missingKinds.map((kind) => <li key={kind}>{t(locale, `enum.PacketKind.${kind}`)}</li>)}
      </ul>
      <PrintFooter locale={locale} demonstration={actor.isDemonstration} />
    </article>
  );
}
