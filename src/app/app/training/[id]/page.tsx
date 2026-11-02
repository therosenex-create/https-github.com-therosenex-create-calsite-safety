import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getTraining, listEmployeeOptions, listProjectOptions } from "@/lib/services/work";
import { archiveTrainingAction, updateTrainingAction } from "@/server/actions";
import { formatDateOnly, toDateInput } from "@/lib/time";

export default async function TrainingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const record = await getTraining(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const canWrite = actor.role !== "WORKER";
  const [people, projects] = canWrite ? await Promise.all([listEmployeeOptions(actor), listProjectOptions(actor)]) : [[], []];
  return (
    <div>
      <p className="text-sm"><Link href="/app/training">{t(locale, "nav.training")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{record.topic}</h1>
      <p className="text-sm text-muted">{record.employee.firstName} {record.employee.lastName} · {formatDateOnly(locale, record.completedOn)}</p>
      {record.expiresOn ? <p className="text-sm">{t(locale, "fields.expiresOn")}: {formatDateOnly(locale, record.expiresOn)}</p> : <p className="text-sm text-muted">{t(locale, "hints.expires")}</p>}
      {canWrite ? (
        <div className="card mt-4">
          <ActionForm action={updateTrainingAction.bind(null, record.id)} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.employee")} name="employeeId" defaultValue={record.employeeId}>
              {people.map((person) => <option key={person.id} value={person.id}>{person.lastName}, {person.firstName}</option>)}
            </SelectField>
            <SelectField label={t(locale, "fields.project")} name="projectId" defaultValue={record.projectId ?? ""}>
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextField label={t(locale, "fields.topic")} name="topic" required defaultValue={record.topic} />
            <TextField label={t(locale, "fields.provider")} name="provider" defaultValue={record.provider} />
            <TextField label={t(locale, "fields.completedOn")} name="completedOn" type="date" required defaultValue={toDateInput(record.completedOn)} />
            <TextField label={t(locale, "fields.expiresOn")} name="expiresOn" type="date" defaultValue={toDateInput(record.expiresOn)} />
            <TextArea label={t(locale, "fields.evidenceNote")} name="evidenceNote" defaultValue={record.evidenceNote} />
          </ActionForm>
          <form className="mt-4" action={archiveTrainingAction.bind(null, record.id)}>
            <button className="btn-secondary" type="submit">{t(locale, "actions.archive")}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
