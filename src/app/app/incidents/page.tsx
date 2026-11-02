import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, Pager, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listIncidents, listProjectOptions } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";
import { createIncidentAction } from "@/server/actions";

const types = ["INJURY", "ILLNESS", "NEAR_MISS", "PROPERTY_DAMAGE", "EXPOSURE", "OTHER"] as const;

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [result, projects] = await Promise.all([listIncidents(actor, { page: params.page }), listProjectOptions(actor)]);
  const elevated = actor.role !== "WORKER";
  return (
    <div>
      <PageHeader title={t(locale, "nav.incidents")} subtitle={t(locale, "emergency")} />
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.incidents")}</li> : null}
        {result.items.map((incident) => (
          <li key={incident.id} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/incidents/${incident.id}`}>{t(locale, `enum.IncidentType.${incident.type}`)}</Link>
            <p className="text-sm text-muted">{formatPacific(locale, incident.occurredAt)} · {incident.project?.name ?? "—"} · {t(locale, `enum.Severity.${incident.severity}`)}</p>
          </li>
        ))}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/incidents?page=${page}`} />
      <details className="card mt-6" open>
        <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
        <div className="mt-4">
          <ActionForm action={createIncidentAction} submitLabel={t(locale, "actions.create")}>
            <SelectField label={t(locale, "fields.project")} name="projectId">
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <SelectField label={t(locale, "fields.type")} name="type" defaultValue="NEAR_MISS">
              <EnumOptions locale={locale} group="IncidentType" values={types} />
            </SelectField>
            <SelectField label={t(locale, "fields.severity")} name="severity" defaultValue="LOW">
              <EnumOptions locale={locale} group="Severity" values={["LOW", "MEDIUM", "HIGH", "IMMINENT_DANGER"]} />
            </SelectField>
            <TextField label={t(locale, "fields.occurredAt")} name="occurredAt" type="datetime-local" required hint={t(locale, "common.pacific")} />
            <TextField label={t(locale, "fields.location")} name="location" />
            <TextArea label={t(locale, "fields.description")} name="description" required />
            <TextArea label={t(locale, "fields.immediateActions")} name="immediateActions" />
            <TextField label={t(locale, "fields.peopleInvolved")} name="peopleInvolved" />
            {elevated ? <TextArea label={t(locale, "fields.investigationNotes")} name="investigationNotes" hint={t(locale, "hints.investigation")} /> : <input type="hidden" name="investigationNotes" value="" />}
            <SelectField label={t(locale, "fields.status")} name="status" defaultValue="OPEN">
              <EnumOptions locale={locale} group="IncidentStatus" values={elevated ? ["OPEN", "UNDER_REVIEW", "CLOSED"] : ["OPEN", "UNDER_REVIEW"]} />
            </SelectField>
          </ActionForm>
        </div>
      </details>
    </div>
  );
}
