import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getOrganization } from "@/lib/services/accounts";
import { listDocuments } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";
import { licenseCheckAction, updateOrgAction } from "@/server/actions";

const checks = ["VERIFICATION_REQUIRED", "LOOKUP_FAILED", "MANUALLY_RECORDED", "STALE", "EXPIRED", "SUSPENDED", "INACTIVE", "CANCELED"] as const;

export default async function LicensingPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [{ organization, checks: history }, documents] = await Promise.all([
    getOrganization(actor),
    actor.role === "ADMIN" ? listDocuments(actor) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t(locale, "nav.licensing")} subtitle={t(locale, "license.workflow")} />
      <p className="note">{t(locale, "common.notLive")}</p>
      <section className="card text-sm">
        <p>CSLB {organization.cslbLicenseNumber ?? "—"} · {t(locale, `enum.VerificationStatus.${organization.cslbVerificationStatus}`)}</p>
        <p className="mt-2">DIR {organization.dirRegistrationNumber ?? "—"} · {t(locale, `enum.VerificationStatus.${organization.dirVerificationStatus}`)}</p>
        <p className="mt-3 text-muted"><Link className="underline" href="/app/settings">{t(locale, "nav.settings")}</Link></p>
      </section>
      <section>
        <h2 className="font-serif text-2xl text-navy">{t(locale, "fields.evidenceNote")}</h2>
        <ul className="mt-3 space-y-3">
          {history.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
          {history.map((check) => (
            <li key={check.id} className="card text-sm">
              <p className="font-semibold">{check.kind} · {t(locale, `enum.VerificationStatus.${check.status}`)}</p>
              <p className="text-muted">{formatPacific(locale, check.checkedAt)}</p>
              <p className="mt-2 whitespace-pre-wrap">{check.note}</p>
              {check.documentId ? <p className="mt-2"><Link className="underline" href={`/app/documents/${check.documentId}`}>{t(locale, "nav.files")}</Link></p> : null}
            </li>
          ))}
        </ul>
      </section>
      {actor.role === "ADMIN" ? (
        <>
          <section className="card">
            <ActionForm action={updateOrgAction} submitLabel={t(locale, "actions.save")}>
              <TextField label={t(locale, "fields.companyName")} name="name" required defaultValue={organization.name} />
              <TextField label={t(locale, "fields.legalName")} name="legalName" defaultValue={organization.legalName} />
              <TextField label={t(locale, "fields.dba")} name="dba" defaultValue={organization.dba} />
              <TextField label={t(locale, "fields.mailingCity")} name="mailingCity" defaultValue={organization.mailingCity} />
              <TextField label={t(locale, "fields.mailingState")} name="mailingState" defaultValue={organization.mailingState} />
              <TextField label={t(locale, "fields.cslbLicenseNumber")} name="cslbLicenseNumber" defaultValue={organization.cslbLicenseNumber} />
              <TextField label={t(locale, "fields.cslbClassification")} name="cslbClassification" defaultValue={organization.cslbClassification} />
              <TextField label={t(locale, "fields.dirRegistrationNumber")} name="dirRegistrationNumber" defaultValue={organization.dirRegistrationNumber} />
            </ActionForm>
          </section>
          <section className="card">
            <ActionForm action={licenseCheckAction} submitLabel={t(locale, "actions.recordCheck")}>
              <SelectField label={t(locale, "fields.kind")} name="kind" defaultValue="CSLB">
                <option value="CSLB">CSLB</option>
                <option value="DIR_PWCR">DIR</option>
              </SelectField>
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue="MANUALLY_RECORDED">
                <EnumOptions locale={locale} group="VerificationStatus" values={checks} />
              </SelectField>
              <TextArea label={t(locale, "fields.evidenceNote")} name="note" required hint={t(locale, "common.notLive")} />
              <SelectField label={t(locale, "fields.file")} name="documentId">
                <option value="">—</option>
                {documents?.items.map((document) => (
                  <option key={document.id} value={document.id}>{document.title}</option>
                ))}
              </SelectField>
            </ActionForm>
          </section>
        </>
      ) : null}
    </div>
  );
}
