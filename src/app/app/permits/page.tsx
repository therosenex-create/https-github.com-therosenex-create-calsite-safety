import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { permitGaps } from "@/lib/permit-gaps";
import { listPermits } from "@/lib/services/records";
import { listDocuments, listProjectOptions } from "@/lib/services/work";
import { formatDateOnly } from "@/lib/time";
import { permitAction } from "@/server/actions";

const statuses = ["UNKNOWN", "NOT_STARTED", "DRAFT", "SUBMITTED", "CORRECTIONS", "USER_REPORTED_APPROVAL", "ISSUED", "CLOSED"] as const;
const categories = ["custom", "building", "demolition", "electrical", "mechanical", "plumbing", "grading", "excavation", "encroachment", "fire", "other"] as const;

export default async function PermitsPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [permits, projects, documents] = await Promise.all([
    listPermits(actor),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
    actor.role === "WORKER" ? Promise.resolve(null) : listDocuments(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.permits")} subtitle={t(locale, "permit.notRequired")} />
      <p className="note mb-4">{t(locale, "permit.evidence")}</p>
      <ul className="space-y-3">
        {permits.length === 0 ? <li className="text-sm text-muted">{t(locale, "permit.empty")}</li> : null}
        {permits.map((permit) => (
          <li key={permit.id} className="card text-sm">
            <p className="font-semibold">{permit.permitType} · {permit.authorityName}</p>
            <p className="text-muted">{permit.project.name} · {permit.jurisdictionLabel} · {t(locale, `enum.PermitRecordStatus.${permit.status}`)}</p>
            <p>{t(locale, `enum.ReviewStatus.${permit.sourceReviewStatus}`)}</p>
            {permit.officialUrl ? <p><a className="underline" href={permit.officialUrl}>{permit.officialUrl}</a></p> : <p className="text-muted">{t(locale, "city.noExtract")}</p>}
            {permit.appliedOn ? <p>{formatDateOnly(locale, permit.appliedOn)}</p> : null}
            {permitGaps(permit).length ? (
              <p className="mt-2 text-muted">{t(locale, "permit.gaps")}: {permitGaps(permit).map((gap) => t(locale, `gap.${gap}`)).join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {actor.role !== "WORKER" ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.add")}</summary>
          <div className="mt-4">
            <ActionForm action={permitAction} submitLabel={t(locale, "actions.save")}>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.authority")} name="authorityName" required />
              <TextField label={t(locale, "fields.jurisdictionLabel")} name="jurisdictionLabel" required />
              <SelectField label={t(locale, "fields.category")} name="permitCategory" defaultValue="custom">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.permitType")} name="permitType" required />
              <TextField label={t(locale, "fields.permitNumber")} name="permitNumber" />
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue="UNKNOWN">
                <EnumOptions locale={locale} group="PermitRecordStatus" values={statuses} />
              </SelectField>
              <TextField label={t(locale, "fields.startDate")} name="appliedOn" type="date" />
              <TextField label={t(locale, "fields.issuedOn")} name="issuedOn" type="date" />
              <TextField label={t(locale, "fields.expiresOn")} name="expiresOn" type="date" />
              <TextField label={t(locale, "fields.closedOn")} name="closedOn" type="date" />
              <TextField label={t(locale, "fields.officialUrl")} name="officialUrl" hint={t(locale, "city.noExtract")} />
              <SelectField label={t(locale, "fields.file")} name="documentId">
                <option value="">—</option>
                {documents?.items.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
              </SelectField>
              <TextArea label={t(locale, "fields.notes")} name="notes" hint={t(locale, "permit.evidence")} />
            </ActionForm>
          </div>
        </details>
      ) : null}
      <p className="mt-4 text-sm"><Link className="underline" href="/app/jurisdictions">{t(locale, "nav.cities")}</Link></p>
    </div>
  );
}
