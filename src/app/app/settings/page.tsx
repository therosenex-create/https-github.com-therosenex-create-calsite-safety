import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getOrganization, listMembers } from "@/lib/services/accounts";
import { inviteAction, licenseCheckAction, passwordAction, roleAction, updateOrgAction } from "@/server/actions";

const checks = ["VERIFICATION_REQUIRED", "LOOKUP_FAILED", "MANUALLY_RECORDED", "STALE", "EXPIRED", "SUSPENDED", "INACTIVE", "CANCELED"] as const;

export default async function SettingsPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [{ organization, checks: history }, members] = await Promise.all([getOrganization(actor), listMembers(actor)]);
  const admin = actor.role === "ADMIN";
  return (
    <div className="space-y-6">
      <PageHeader title={t(locale, "nav.settings")} />
      <p className="text-sm"><Link className="underline" href="/app/audit">{t(locale, "nav.audit")}</Link></p>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.account")}</h2>
        <p className="text-sm">{actor.name} · {actor.email} · {t(locale, `enum.MembershipRole.${actor.role}`)}</p>
        <div className="mt-4">
          <ActionForm action={passwordAction} submitLabel={t(locale, "actions.setPassword")}>
            <TextField label={t(locale, "fields.currentPassword")} name="currentPassword" type="password" required />
            <TextField label={t(locale, "fields.password")} name="password" type="password" required hint={t(locale, "hints.password")} />
            <TextField label={t(locale, "fields.confirmPassword")} name="confirmPassword" type="password" required />
          </ActionForm>
        </div>
      </section>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.license")}</h2>
        <p className="note mt-2">{t(locale, "common.notLive")}</p>
        <p className="mt-3 text-sm">CSLB {organization.cslbLicenseNumber ?? "—"} · {t(locale, `enum.VerificationStatus.${organization.cslbVerificationStatus}`)}</p>
        <p className="text-sm">DIR {organization.dirRegistrationNumber ?? "—"} · {t(locale, `enum.VerificationStatus.${organization.dirVerificationStatus}`)}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {history.map((check) => (
            <li key={check.id}>{check.kind}: {t(locale, `enum.VerificationStatus.${check.status}`)} — {check.note}</li>
          ))}
        </ul>
        {admin ? (
          <div className="mt-4">
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
            <div className="mt-6">
              <ActionForm action={licenseCheckAction} submitLabel={t(locale, "actions.recordCheck")}>
                <SelectField label={t(locale, "fields.kind")} name="kind" defaultValue="CSLB">
                  <option value="CSLB">CSLB</option>
                  <option value="DIR_PWCR">DIR</option>
                </SelectField>
                <SelectField label={t(locale, "fields.status")} name="status" defaultValue="VERIFICATION_REQUIRED">
                  <EnumOptions locale={locale} group="VerificationStatus" values={checks} />
                </SelectField>
                <TextArea label={t(locale, "fields.note")} name="note" required hint={t(locale, "common.notLive")} />
              </ActionForm>
            </div>
          </div>
        ) : null}
      </section>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.members")}</h2>
        <p className="hint">{t(locale, "common.noEmailDelivery")}</p>
        <ul className="mt-3 space-y-3 text-sm">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{member.user.name} · {member.user.email}</span>
              {admin ? (
                <form action={roleAction.bind(null, member.id)} className="flex gap-2">
                  <select className="input mt-0" name="role" defaultValue={member.role}>
                    <EnumOptions locale={locale} group="MembershipRole" values={["ADMIN", "SAFETY_MANAGER", "WORKER"]} />
                  </select>
                  <button className="btn-secondary" type="submit">{t(locale, "actions.save")}</button>
                </form>
              ) : (
                <span>{t(locale, `enum.MembershipRole.${member.role}`)}</span>
              )}
            </li>
          ))}
        </ul>
        {admin ? (
          <div className="mt-4">
            <ActionForm action={inviteAction} submitLabel={t(locale, "actions.invite")}>
              <TextField label={t(locale, "fields.name")} name="name" required />
              <TextField label={t(locale, "fields.email")} name="email" type="email" required />
              <TextField label={t(locale, "fields.password")} name="password" type="password" required hint={t(locale, "hints.password")} />
              <SelectField label={t(locale, "fields.role")} name="role" defaultValue="WORKER">
                <EnumOptions locale={locale} group="MembershipRole" values={["ADMIN", "SAFETY_MANAGER", "WORKER"]} />
              </SelectField>
            </ActionForm>
          </div>
        ) : null}
      </section>
    </div>
  );
}
