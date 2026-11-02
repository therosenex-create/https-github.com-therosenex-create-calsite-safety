import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { SelectField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { PACKET_KINDS, getPacketExport, listPacketChoices } from "@/lib/services/packets";
import { formatPacific } from "@/lib/time";
import { packetItemAction } from "@/server/actions";

export default async function PacketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const view = await getPacketExport(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const choices = actor.role === "WORKER" ? null : await listPacketChoices(actor, view.packet.projectId);
  const options = choices
    ? {
        MEETING: choices.meetings.map((row) => ({ id: row.id, label: row.title })),
        INSPECTION: choices.inspections.map((row) => ({ id: row.id, label: row.category })),
        INCIDENT: choices.incidents.map((row) => ({ id: row.id, label: row.type })),
        PERMIT: choices.permits.map((row) => ({ id: row.id, label: row.permitType })),
        DOCUMENT: choices.documents.map((row) => ({ id: row.id, label: row.title })),
        PUBLIC_WORKS: choices.works.map((row) => ({ id: row.id, label: row.awardingBody })),
      }
    : null;
  return (
    <div>
      <p className="text-sm"><Link href="/app/packets">{t(locale, "nav.packets")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{view.packet.title}</h1>
      <p className="mt-1 text-sm text-muted">{view.packet.project?.name ?? "—"} · {formatPacific(locale, view.packet.createdAt)}</p>
      <p className="note mt-3">{t(locale, "packet.intro")}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm">{view.packet.purposeNote}</p>
      <p className="mt-3 text-sm"><Link className="underline" href={`/app/packets/${view.packet.id}/print`}>{t(locale, "actions.print")}</Link></p>
      <ul className="mt-4 space-y-2 text-sm">
        {view.included.map((item) => (
          <li key={`${item.kind}-${item.recordId}`} className="card">
            <p className="font-semibold">{t(locale, `enum.PacketKind.${item.kind}`)} · {item.label}</p>
            {item.state === "included" ? <p className="mt-1 whitespace-pre-wrap">{item.detail}</p> : null}
            {item.state === "withheld" ? <p className="mt-1">{t(locale, "packet.withheld")}</p> : null}
            {item.state === "missing" ? <p className="mt-1">{t(locale, "packet.gone")}</p> : null}
          </li>
        ))}
      </ul>
      <section className="card mt-4">
        <h2 className="font-semibold">{t(locale, "packet.missing")}</h2>
        <ul className="mt-2 text-sm">
          {view.missingKinds.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
          {view.missingKinds.map((kind) => <li key={kind}>{t(locale, `enum.PacketKind.${kind}`)}</li>)}
        </ul>
      </section>
      {options ? (
        <div className="mt-6 space-y-4">
          {PACKET_KINDS.filter((kind) => options[kind].length > 0).map((kind) => (
            <div key={kind} className="card">
              <ActionForm action={packetItemAction} submitLabel={t(locale, "actions.save")}>
                <input type="hidden" name="packetId" value={view.packet.id} />
                <input type="hidden" name="kind" value={kind} />
                <SelectField label={t(locale, `enum.PacketKind.${kind}`)} name="recordId">
                  {options[kind].map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
                </SelectField>
              </ActionForm>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
