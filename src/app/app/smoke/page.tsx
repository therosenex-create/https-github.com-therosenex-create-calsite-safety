import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listSmokePlans } from "@/lib/services/field-ops";
import { listProjectOptions } from "@/lib/services/work";
import { smokePlanAction } from "@/server/actions";

export default async function SmokePage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [plans, projects] = await Promise.all([
    listSmokePlans(actor),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.smoke")} subtitle={t(locale, "smoke.intro")} />
      <p className="text-sm"><Link className="underline" href="/app/regulatory">CCR-T8-5141-1</Link></p>
      <ul className="mt-4 space-y-3">
        {plans.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {plans.map((plan) => (
          <li key={plan.id} className="card text-sm">
            <p className="font-semibold">{plan.project?.name ?? t(locale, "fields.companyName")}</p>
            <p className="mt-2 whitespace-pre-wrap">{plan.manualCheckProcedure}</p>
          </li>
        ))}
      </ul>
      {actor.role !== "WORKER" ? (
        <div className="card mt-6">
          <ActionForm action={smokePlanAction} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.project")} name="projectId">
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextArea label={t(locale, "fields.manualAqi")} name="manualCheckProcedure" required />
            <TextArea label={t(locale, "fields.controls")} name="controlNote" required />
            <TextArea label={t(locale, "fields.respirator")} name="respiratorNote" />
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
