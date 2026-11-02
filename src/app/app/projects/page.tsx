import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, Pager, SelectField, TextArea, TextField } from "@/components/fields";
import { StatusPill } from "@/components/status-pill";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listProjects, listTailgateCadence } from "@/lib/services/work";
import { formatDateOnly } from "@/lib/time";
import { createProjectAction } from "@/server/actions";

const owners = ["PRIVATE", "PUBLIC_AGENCY", "SCHOOL_OR_COLLEGE", "SPECIAL_DISTRICT", "HOMEOWNER", "UNKNOWN"] as const;
const works = ["UNKNOWN", "POTENTIALLY_APPLICABLE", "NOT_APPLICABLE", "APPLICABLE", "PENDING_QUALIFIED_REVIEW"] as const;
const statuses = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETE"] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; archived?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const archived = params.archived === "1";
  const [result, cadence] = await Promise.all([
    listProjects(actor, { page: params.page, q: params.q, archived }),
    archived ? Promise.resolve([]) : listTailgateCadence(actor),
  ]);
  const cadenceById = new Map(cadence.map((row) => [row.id, row]));
  const canWrite = actor.role !== "WORKER";
  return (
    <div>
      <PageHeader title={t(locale, "nav.projects")} subtitle={t(locale, "hints.jurisdiction")} />
      <form className="mb-4 flex gap-2" action="/app/projects">
        <input className="input mt-0" name="q" defaultValue={params.q ?? ""} aria-label={t(locale, "actions.search")} />
        <button className="btn" type="submit">{t(locale, "actions.search")}</button>
      </form>
      <p className="mb-4 text-sm">
        <Link className="underline" href={archived ? "/app/projects" : "/app/projects?archived=1"}>
          {archived ? t(locale, "actions.hideArchived") : t(locale, "actions.showArchived")}
        </Link>
      </p>
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.projects")}</li> : null}
        {result.items.map((project) => {
          const row = cadenceById.get(project.id);
          return (
            <li key={project.id} className="card">
              <Link className="text-lg font-semibold text-navy underline" href={`/app/projects/${project.id}`}>{project.name}</Link>
              <p className="text-sm text-muted">{project.city}, {project.county} County · {t(locale, `enum.ProjectStatus.${project.status}`)}</p>
              {row ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    {t(locale, "tailgate.last")}: {formatDateOnly(locale, row.lastAt)}
                  </span>
                  <StatusPill tone={row.cadence === "ON_TIME" ? "ok" : "due"}>{t(locale, `enum.TailgateCadence.${row.cadence}`)}</StatusPill>
                  <Link className="underline" href={`/app/tailgates?project=${project.id}`}>{t(locale, "nav.tailgates")}</Link>
                </p>
              ) : null}
              {!project.jurisdictionConfirmed ? <p className="note mt-2">{t(locale, "hints.jurisdiction")}</p> : null}
            </li>
          );
        })}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/projects?page=${page}${archived ? "&archived=1" : ""}`} />
      {canWrite ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
          <div className="mt-4">
            <ActionForm action={createProjectAction} submitLabel={t(locale, "actions.create")}>
              <TextField label={t(locale, "fields.name")} name="name" required />
              <TextField label={t(locale, "fields.jobsiteName")} name="jobsiteName" />
              <TextField label={t(locale, "fields.streetAddress")} name="streetAddress" required />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.city")} name="city" required />
                <TextField label={t(locale, "fields.county")} name="county" required hint={t(locale, "hints.county")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.state")} name="state" defaultValue="CA" required />
                <TextField label={t(locale, "fields.postalCode")} name="postalCode" />
              </div>
              <SelectField label={t(locale, "fields.ownerType")} name="ownerType" defaultValue="UNKNOWN">
                <EnumOptions locale={locale} group="OwnerType" values={owners} />
              </SelectField>
              <TextField label={t(locale, "fields.ownerName")} name="ownerName" />
              <SelectField label={t(locale, "fields.publicWorksStatus")} name="publicWorksStatus" defaultValue="UNKNOWN" hint={t(locale, "hints.publicWorks")}>
                <EnumOptions locale={locale} group="PublicWorksStatus" values={works} />
              </SelectField>
              <TextArea label={t(locale, "fields.publicWorksRationale")} name="publicWorksRationale" />
              <TextArea label={t(locale, "fields.scopeOfWork")} name="scopeOfWork" />
              <TextArea label={t(locale, "fields.description")} name="description" />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.startDate")} name="startDate" type="date" />
                <TextField label={t(locale, "fields.endDate")} name="endDate" type="date" />
              </div>
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue="PLANNED">
                <EnumOptions locale={locale} group="ProjectStatus" values={statuses} />
              </SelectField>
              <SelectField label={t(locale, "fields.jurisdictionConfirmed")} name="jurisdictionConfirmed" defaultValue="no" hint={t(locale, "hints.jurisdiction")}>
                <option value="no">{t(locale, "no")}</option>
                <option value="yes">{t(locale, "yes")}</option>
              </SelectField>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
