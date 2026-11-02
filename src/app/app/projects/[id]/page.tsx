import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, SelectField, TextArea, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getProjectDashboard } from "@/lib/services/reporting";
import { getProject, listEmployeeOptions } from "@/lib/services/work";
import { archiveProjectAction, assignCrewAction, removeCrewAction, updateProjectAction } from "@/server/actions";
import { toDateInput } from "@/lib/time";

const owners = ["PRIVATE", "PUBLIC_AGENCY", "SCHOOL_OR_COLLEGE", "SPECIAL_DISTRICT", "HOMEOWNER", "UNKNOWN"] as const;
const works = ["UNKNOWN", "POTENTIALLY_APPLICABLE", "NOT_APPLICABLE", "APPLICABLE", "PENDING_QUALIFIED_REVIEW"] as const;
const statuses = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETE"] as const;

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const project = await getProject(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const people = actor.role === "WORKER" ? [] : await listEmployeeOptions(actor);
  const canWrite = actor.role !== "WORKER";
  const dashboard = await getProjectDashboard(actor, project.id);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted"><Link href="/app/projects">{t(locale, "nav.projects")}</Link></p>
        <h1 className="font-serif text-3xl text-navy">{project.name}</h1>
        <p className="mt-1 text-sm">{project.streetAddress}, {project.city}, {project.county} County, {project.state}</p>
        <p className="mt-2 text-sm"><Link className="underline" href={`/app/contracts?project=${project.id}`}>{t(locale, "nav.contracts")}</Link></p>
        {!project.jurisdictionConfirmed ? <p className="note mt-3">{t(locale, "hints.jurisdiction")}</p> : null}
        <p className="mt-3 text-sm">{t(locale, `enum.PublicWorksStatus.${project.publicWorksStatus}`)}</p>
        {project.publicWorksRationale ? <p className="text-sm text-muted">{project.publicWorksRationale}</p> : null}
      </div>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "dash.intro")}</h2>
        <ul className="mt-4 space-y-4 text-sm">
          <li>
            <p className="font-semibold">{t(locale, "dash.actions")} · {dashboard.openCorrectiveActions.count}</p>
            <ul className="mt-1 space-y-1">
              {dashboard.openCorrectiveActions.items.map((item) => (
                <li key={item.id}><Link className="underline" href={`/app/inspections/${item.inspectionId}`}>{item.description}</Link></li>
              ))}
            </ul>
          </li>
          <li>
            <p className="font-semibold">{t(locale, "dash.incidents")} · {dashboard.openIncidents.count}</p>
            <ul className="mt-1 space-y-1">
              {dashboard.openIncidents.items.map((item) => (
                <li key={item.id}><Link className="underline" href={`/app/incidents/${item.id}`}>{t(locale, `enum.IncidentType.${item.type}`)}</Link></li>
              ))}
            </ul>
          </li>
          <li>
            <p className="font-semibold">{t(locale, "dash.training")} · {dashboard.trainingPointers.count}</p>
            <ul className="mt-1 space-y-1">
              {dashboard.trainingPointers.items.map((item) => (
                <li key={item.id}><Link className="underline" href={`/app/training/${item.id}`}>{item.topic}</Link> · {t(locale, item.kind === "expired" ? "dash.expired" : "dash.expiring")}</li>
              ))}
            </ul>
          </li>
          <li>
            <p className="font-semibold">{t(locale, "dash.permits")} · {dashboard.permits.count}</p>
            <ul className="mt-1 space-y-1">
              {dashboard.permits.items.map((item) => (
                <li key={item.id}><Link className="underline" href="/app/permits">{item.permitType}</Link> · {t(locale, `enum.PermitRecordStatus.${item.status}`)}</li>
              ))}
            </ul>
          </li>
          <li>
            <p className="font-semibold">{t(locale, "dash.closeout")} · {dashboard.closeoutIncomplete.count}</p>
            <p><Link className="underline" href={`/app/public-works?project=${project.id}`}>{t(locale, "nav.publicWorks")}</Link></p>
            <ul className="mt-1">
              {dashboard.closeoutIncomplete.keys.map((key) => <li key={key}>{t(locale, `enum.Closeout.${key}`)}</li>)}
            </ul>
          </li>
          <li>
            <p className="font-semibold">{t(locale, "dash.pending")} · {dashboard.pendingApplicability.count}</p>
            <ul className="mt-1 space-y-1">
              {dashboard.pendingApplicability.items.map((item) => (
                <li key={item.id}><Link className="underline" href={`/app/regulatory/requirements/${item.id}`}>{item.citation}</Link></li>
              ))}
            </ul>
          </li>
        </ul>
      </section>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.requirements")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {project.requirements.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
          {project.requirements.map((row) => (
            <li key={row.id}>
              <Link className="font-semibold underline" href={`/app/regulatory/requirements/${row.requirementId}`}>{row.requirement.citation}</Link>
              {" · "}{t(locale, `enum.ApplicabilityState.${row.applicability}`)}
              <p className="text-muted">{row.rationale}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm"><Link className="underline" href="/app/regulatory">{t(locale, "nav.requirements")}</Link></p>
      </section>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.crew")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {project.assignments.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
          {project.assignments.map((assignment) => (
            <li key={assignment.id} className="flex items-center justify-between gap-3">
              <span>{assignment.employee.firstName} {assignment.employee.lastName}</span>
              {canWrite ? (
                <form action={removeCrewAction.bind(null, project.id, assignment.employeeId)}>
                  <button className="btn-secondary" type="submit">{t(locale, "crew.remove")}</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {canWrite ? (
          <div className="mt-4">
            <ActionForm action={assignCrewAction.bind(null, project.id)} submitLabel={t(locale, "crew.add")}>
              <SelectField label={t(locale, "fields.employee")} name="employeeId">
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.lastName}, {person.firstName}</option>
                ))}
              </SelectField>
            </ActionForm>
          </div>
        ) : null}
      </section>
      {canWrite ? (
        <section className="card">
          <h2 className="font-serif text-2xl">{t(locale, "section.details")}</h2>
          <div className="mt-4">
            <ActionForm action={updateProjectAction.bind(null, project.id)} submitLabel={t(locale, "actions.save")}>
              <TextField label={t(locale, "fields.name")} name="name" required defaultValue={project.name} />
              <TextField label={t(locale, "fields.jobsiteName")} name="jobsiteName" defaultValue={project.jobsiteName} />
              <TextField label={t(locale, "fields.streetAddress")} name="streetAddress" required defaultValue={project.streetAddress} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.city")} name="city" required defaultValue={project.city} />
                <TextField label={t(locale, "fields.county")} name="county" required defaultValue={project.county} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.state")} name="state" required defaultValue={project.state} />
                <TextField label={t(locale, "fields.postalCode")} name="postalCode" defaultValue={project.postalCode} />
              </div>
              <SelectField label={t(locale, "fields.ownerType")} name="ownerType" defaultValue={project.ownerType}>
                <EnumOptions locale={locale} group="OwnerType" values={owners} />
              </SelectField>
              <TextField label={t(locale, "fields.ownerName")} name="ownerName" defaultValue={project.ownerName} />
              <SelectField label={t(locale, "fields.publicWorksStatus")} name="publicWorksStatus" defaultValue={project.publicWorksStatus} hint={t(locale, "hints.publicWorks")}>
                <EnumOptions locale={locale} group="PublicWorksStatus" values={works} />
              </SelectField>
              <TextArea label={t(locale, "fields.publicWorksRationale")} name="publicWorksRationale" defaultValue={project.publicWorksRationale} />
              <TextArea label={t(locale, "fields.scopeOfWork")} name="scopeOfWork" defaultValue={project.scopeOfWork} />
              <TextArea label={t(locale, "fields.description")} name="description" defaultValue={project.description} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.startDate")} name="startDate" type="date" defaultValue={toDateInput(project.startDate)} />
                <TextField label={t(locale, "fields.endDate")} name="endDate" type="date" defaultValue={toDateInput(project.endDate)} />
              </div>
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue={project.status === "ARCHIVED" ? "COMPLETE" : project.status}>
                <EnumOptions locale={locale} group="ProjectStatus" values={statuses} />
              </SelectField>
              <SelectField label={t(locale, "fields.jurisdictionConfirmed")} name="jurisdictionConfirmed" defaultValue={project.jurisdictionConfirmed ? "yes" : "no"}>
                <option value="no">{t(locale, "no")}</option>
                <option value="yes">{t(locale, "yes")}</option>
              </SelectField>
            </ActionForm>
          </div>
          <form className="mt-4" action={archiveProjectAction.bind(null, project.id)}>
            <button className="btn-secondary" type="submit">{t(locale, "actions.archive")}</button>
            <p className="hint">{t(locale, "common.archiveConfirm")}</p>
          </form>
        </section>
      ) : null}
    </div>
  );
}
