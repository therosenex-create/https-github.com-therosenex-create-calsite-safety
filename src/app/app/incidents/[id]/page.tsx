import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, SelectField, TextArea, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getIncident, listProjectOptions } from "@/lib/services/work";
import { formatPacific, utcToPacificInput } from "@/lib/time";
import { updateIncidentAction } from "@/server/actions";

const types = ["INJURY", "ILLNESS", "NEAR_MISS", "PROPERTY_DAMAGE", "EXPOSURE", "OTHER"] as const;

export default async function IncidentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const incident = await getIncident(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const projects = await listProjectOptions(actor);
  const elevated = actor.role !== "WORKER";
  return (
    <div>
      <p className="text-sm"><Link href="/app/incidents">{t(locale, "nav.incidents")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{t(locale, `enum.IncidentType.${incident.type}`)}</h1>
      <p className="text-sm text-muted">{formatPacific(locale, incident.occurredAt)}</p>
      {incident.severity === "IMMINENT_DANGER" ? <p className="alert mt-3">{t(locale, "emergency")}</p> : null}
      <div className="card mt-4">
        <ActionForm action={updateIncidentAction.bind(null, incident.id)} submitLabel={t(locale, "actions.save")}>
          <SelectField label={t(locale, "fields.project")} name="projectId" defaultValue={incident.projectId ?? ""}>
            <option value="">—</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </SelectField>
          <SelectField label={t(locale, "fields.type")} name="type" defaultValue={incident.type}>
            <EnumOptions locale={locale} group="IncidentType" values={types} />
          </SelectField>
          <SelectField label={t(locale, "fields.severity")} name="severity" defaultValue={incident.severity}>
            <EnumOptions locale={locale} group="Severity" values={["LOW", "MEDIUM", "HIGH", "IMMINENT_DANGER"]} />
          </SelectField>
          <TextField label={t(locale, "fields.occurredAt")} name="occurredAt" type="datetime-local" required defaultValue={utcToPacificInput(incident.occurredAt)} />
          <TextField label={t(locale, "fields.location")} name="location" defaultValue={incident.location} />
          <TextArea label={t(locale, "fields.description")} name="description" required defaultValue={incident.description} />
          <TextArea label={t(locale, "fields.immediateActions")} name="immediateActions" defaultValue={incident.immediateActions} />
          <TextField label={t(locale, "fields.peopleInvolved")} name="peopleInvolved" defaultValue={incident.peopleInvolved} />
          {elevated ? (
            <TextArea label={t(locale, "fields.investigationNotes")} name="investigationNotes" defaultValue={incident.investigationNotes} hint={t(locale, "hints.investigation")} />
          ) : (
            <input type="hidden" name="investigationNotes" value="" />
          )}
          <SelectField label={t(locale, "fields.status")} name="status" defaultValue={incident.status === "ARCHIVED" ? "OPEN" : incident.status}>
            <EnumOptions locale={locale} group="IncidentStatus" values={elevated ? ["OPEN", "UNDER_REVIEW", "CLOSED"] : ["OPEN", "UNDER_REVIEW"]} />
          </SelectField>
        </ActionForm>
      </div>
    </div>
  );
}
