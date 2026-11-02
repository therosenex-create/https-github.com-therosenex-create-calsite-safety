import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, Pager, SelectField, TextArea, TextField } from "@/components/fields";
import { INSPECTION_CATEGORIES } from "@/lib/checklists";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listInspections, listProjectOptions } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";
import { createInspectionAction } from "@/server/actions";

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [result, projects] = await Promise.all([
    listInspections(actor, { page: params.page }),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.inspections")} subtitle={t(locale, "hints.checklist")} />
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.inspections")}</li> : null}
        {result.items.map((inspection) => (
          <li key={inspection.id} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/inspections/${inspection.id}`}>{t(locale, `enum.category.${inspection.category}`)}</Link>
            <p className="text-sm text-muted">{inspection.project.name} · {formatPacific(locale, inspection.inspectedAt)} · {inspection._count.findings}</p>
          </li>
        ))}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/inspections?page=${page}`} />
      {actor.role !== "WORKER" ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
          <div className="mt-4">
            <ActionForm action={createInspectionAction} submitLabel={t(locale, "actions.create")}>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <SelectField label={t(locale, "fields.category")} name="category" defaultValue="general">
                <EnumOptions locale={locale} group="category" values={INSPECTION_CATEGORIES} />
              </SelectField>
              <TextField label={t(locale, "fields.inspectedAt")} name="inspectedAt" type="datetime-local" required hint={t(locale, "common.pacific")} />
              <TextField label={t(locale, "fields.inspectorName")} name="inspectorName" required />
              <TextField label={t(locale, "fields.location")} name="location" />
              <TextArea label={t(locale, "fields.summary")} name="summary" required />
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue="OPEN">
                <EnumOptions locale={locale} group="InspectionStatus" values={["OPEN", "CLOSED"]} />
              </SelectField>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
