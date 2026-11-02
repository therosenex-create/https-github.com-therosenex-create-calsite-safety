import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, Pager, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listEmployeeOptions, listProjectOptions, listTraining } from "@/lib/services/work";
import { formatDateOnly } from "@/lib/time";
import { createTrainingAction } from "@/server/actions";

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const result = await listTraining(actor, { page: params.page });
  const canWrite = actor.role !== "WORKER";
  const [people, projects] = canWrite ? await Promise.all([listEmployeeOptions(actor), listProjectOptions(actor)]) : [[], []];
  return (
    <div>
      <PageHeader title={t(locale, "nav.training")} subtitle={t(locale, "hints.expires")} />
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.training")}</li> : null}
        {result.items.map((record) => (
          <li key={record.id} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/training/${record.id}`}>{record.topic}</Link>
            <p className="text-sm text-muted">{record.employee.firstName} {record.employee.lastName} · {formatDateOnly(locale, record.completedOn)}</p>
          </li>
        ))}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/training?page=${page}`} />
      {canWrite ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
          <div className="mt-4">
            <ActionForm action={createTrainingAction} submitLabel={t(locale, "actions.create")}>
              <SelectField label={t(locale, "fields.employee")} name="employeeId">
                {people.map((person) => <option key={person.id} value={person.id}>{person.lastName}, {person.firstName}</option>)}
              </SelectField>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                <option value="">—</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.topic")} name="topic" required />
              <TextField label={t(locale, "fields.provider")} name="provider" />
              <TextField label={t(locale, "fields.completedOn")} name="completedOn" type="date" required />
              <TextField label={t(locale, "fields.expiresOn")} name="expiresOn" type="date" hint={t(locale, "hints.expires")} />
              <TextArea label={t(locale, "fields.evidenceNote")} name="evidenceNote" />
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
