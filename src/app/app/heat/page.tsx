import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listHeatPlans } from "@/lib/services/field-ops";
import { listProjectOptions } from "@/lib/services/work";
import { heatPlanAction } from "@/server/actions";

export default async function HeatPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [plans, projects] = await Promise.all([
    listHeatPlans(actor),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.heat")} subtitle={t(locale, "heat.intro")} />
      <p className="text-sm"><Link className="underline" href="/app/regulatory">CCR-T8-3395</Link></p>
      <ul className="mt-4 space-y-3">
        {plans.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {plans.map((plan) => (
          <li key={plan.id} className="card text-sm">
            <p className="font-semibold">{plan.project?.name ?? t(locale, "fields.companyName")}</p>
            <p className="mt-2 whitespace-pre-wrap">{plan.waterProcedure}</p>
          </li>
        ))}
      </ul>
      {actor.role !== "WORKER" ? (
        <div className="card mt-6">
          <ActionForm action={heatPlanAction} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.project")} name="projectId">
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextArea label={t(locale, "fields.water")} name="waterProcedure" required />
            <TextArea label={t(locale, "fields.shade")} name="shadeProcedure" required />
            <TextArea label={t(locale, "fields.highHeat")} name="highHeatProcedure" required />
            <TextArea label={t(locale, "fields.emergencyPlan")} name="emergencyProcedure" required />
            <TextArea label={t(locale, "fields.trainingNote")} name="trainingNote" />
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
