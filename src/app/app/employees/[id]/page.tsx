import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, SelectField, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getEmployee } from "@/lib/services/work";
import { archiveEmployeeAction, updateEmployeeAction } from "@/server/actions";
import { toDateInput } from "@/lib/time";

export default async function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const person = await getEmployee(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const canWrite = actor.role !== "WORKER";
  return (
    <div>
      <p className="text-sm"><Link href="/app/employees">{t(locale, "nav.people")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{person.firstName} {person.lastName}</h1>
      {!canWrite ? <p className="mt-2 text-sm text-muted">{t(locale, "common.workerLimit")}</p> : null}
      {canWrite ? (
        <div className="card mt-4">
          <ActionForm action={updateEmployeeAction.bind(null, person.id)} submitLabel={t(locale, "actions.save")}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label={t(locale, "fields.firstName")} name="firstName" required defaultValue={person.firstName} />
              <TextField label={t(locale, "fields.lastName")} name="lastName" required defaultValue={person.lastName} />
            </div>
            <TextField label={t(locale, "fields.email")} name="email" type="email" defaultValue={person.email} />
            <TextField label={t(locale, "fields.phone")} name="phone" defaultValue={person.phone} />
            <TextField label={t(locale, "fields.jobTitle")} name="jobTitle" defaultValue={person.jobTitle} />
            <TextField label={t(locale, "fields.trade")} name="trade" defaultValue={person.trade} />
            <SelectField label={t(locale, "fields.preferredLanguage")} name="preferredLanguage" defaultValue={person.preferredLanguage}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </SelectField>
            <TextField label={t(locale, "fields.hireDate")} name="hireDate" type="date" defaultValue={toDateInput(person.hireDate)} />
            <SelectField label={t(locale, "fields.status")} name="status" defaultValue={person.status === "ARCHIVED" ? "INACTIVE" : person.status}>
              <EnumOptions locale={locale} group="EmployeeStatus" values={["ACTIVE", "INACTIVE"]} />
            </SelectField>
          </ActionForm>
          <form className="mt-4" action={archiveEmployeeAction.bind(null, person.id)}>
            <button className="btn-secondary" type="submit">{t(locale, "actions.archive")}</button>
          </form>
        </div>
      ) : (
        <dl className="card mt-4 text-sm">
          <div><dt className="font-semibold">{t(locale, "fields.trade")}</dt><dd>{person.trade ?? "—"}</dd></div>
          <div className="mt-2"><dt className="font-semibold">{t(locale, "fields.jobTitle")}</dt><dd>{person.jobTitle ?? "—"}</dd></div>
        </dl>
      )}
    </div>
  );
}
