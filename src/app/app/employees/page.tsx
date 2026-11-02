import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, Pager, SelectField, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listEmployees } from "@/lib/services/work";
import { createEmployeeAction } from "@/server/actions";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; archived?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const archived = params.archived === "1";
  const result = await listEmployees(actor, { page: params.page, q: params.q, archived });
  return (
    <div>
      <PageHeader title={t(locale, "nav.people")} subtitle={actor.role === "WORKER" ? t(locale, "common.workerLimit") : undefined} />
      <form className="mb-4 flex gap-2">
        <input className="input mt-0" name="q" defaultValue={params.q ?? ""} aria-label={t(locale, "actions.search")} />
        <button className="btn" type="submit">{t(locale, "actions.search")}</button>
      </form>
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.people")}</li> : null}
        {result.items.map((person) => (
          <li key={person.id} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/employees/${person.id}`}>{person.firstName} {person.lastName}</Link>
            <p className="text-sm text-muted">{person.trade ?? "—"} · {person.preferredLanguage === "es" ? "Español" : "English"}</p>
          </li>
        ))}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/employees?page=${page}`} />
      {actor.role !== "WORKER" ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
          <div className="mt-4">
            <ActionForm action={createEmployeeAction} submitLabel={t(locale, "actions.create")}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t(locale, "fields.firstName")} name="firstName" required />
                <TextField label={t(locale, "fields.lastName")} name="lastName" required />
              </div>
              <TextField label={t(locale, "fields.email")} name="email" type="email" />
              <TextField label={t(locale, "fields.phone")} name="phone" />
              <TextField label={t(locale, "fields.jobTitle")} name="jobTitle" />
              <TextField label={t(locale, "fields.trade")} name="trade" />
              <SelectField label={t(locale, "fields.preferredLanguage")} name="preferredLanguage" defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
              </SelectField>
              <TextField label={t(locale, "fields.hireDate")} name="hireDate" type="date" />
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue="ACTIVE">
                <EnumOptions locale={locale} group="EmployeeStatus" values={["ACTIVE", "INACTIVE"]} />
              </SelectField>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
