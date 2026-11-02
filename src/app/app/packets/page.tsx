import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listPackets } from "@/lib/services/packets";
import { listProjectOptions } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";
import { packetAction } from "@/server/actions";

export default async function PacketsPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [packets, projects] = await Promise.all([
    listPackets(actor),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.packets")} subtitle={t(locale, "packet.intro")} />
      <ul className="space-y-3">
        {packets.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {packets.map((packet) => (
          <li key={packet.id} className="card text-sm">
            <Link className="font-semibold underline" href={`/app/packets/${packet.id}`}>{packet.title}</Link>
            <p className="text-muted">{packet.project?.name ?? "—"} · {formatPacific(locale, packet.createdAt)} · {packet._count.items}</p>
            <p className="mt-2 whitespace-pre-wrap">{packet.purposeNote}</p>
          </li>
        ))}
      </ul>
      {actor.role !== "WORKER" ? (
        <div className="card mt-6">
          <ActionForm action={packetAction} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.project")} name="projectId">
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextField label={t(locale, "fields.title")} name="title" required />
            <TextArea label={t(locale, "packet.purpose")} name="purposeNote" required hint={t(locale, "packet.intro")} />
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
