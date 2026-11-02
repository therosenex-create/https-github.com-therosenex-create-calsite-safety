import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listCitySources } from "@/lib/services/records";
import { citySourceAction } from "@/server/actions";

export default async function JurisdictionsPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const sources = await listCitySources(actor);
  return (
    <div>
      <PageHeader title={t(locale, "nav.cities")} subtitle={t(locale, "city.contacts")} />
      <ul className="space-y-3">
        {sources.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {sources.map((source) => (
          <li key={source.id} className="card text-sm">
            <p className="font-semibold">{source.cityName}, {source.countyName} · {t(locale, `enum.AgencyKind.${source.agencyKind}`)} · {source.subject}</p>
            {source.contactName ? <p>{source.contactName} {source.contactPhone ?? ""} {source.contactEmail ?? ""}</p> : null}
            {source.caltransDistrictNote ? <p>{source.caltransDistrictNote}</p> : null}
            <p>{t(locale, `enum.ReviewStatus.${source.reviewStatus}`)}</p>
            <p className="mt-2 whitespace-pre-wrap">{source.notes}</p>
            {source.officialUrl ? <p className="mt-2"><a className="underline" href={source.officialUrl}>{source.officialUrl}</a></p> : null}
            <p className="hint">{t(locale, "city.noExtract")}</p>
          </li>
        ))}
      </ul>
      {actor.role !== "WORKER" ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.add")}</summary>
          <div className="mt-4">
            <ActionForm action={citySourceAction} submitLabel={t(locale, "actions.save")}>
              <TextField label={t(locale, "fields.cityName")} name="cityName" required />
              <TextField label={t(locale, "fields.countyName")} name="countyName" required />
              <SelectField label={t(locale, "fields.agencyKind")} name="agencyKind" defaultValue="CITY">
                <EnumOptions locale={locale} group="AgencyKind" values={["CITY", "COUNTY", "FIRE", "WATER", "SCHOOL_DISTRICT", "CALTRANS_DISTRICT", "OTHER"]} />
              </SelectField>
              <TextField label={t(locale, "fields.subject")} name="subject" required />
              <TextField label={t(locale, "fields.contactName")} name="contactName" />
              <TextField label={t(locale, "fields.contactPhone")} name="contactPhone" />
              <TextField label={t(locale, "fields.contactEmail")} name="contactEmail" />
              <TextArea label={t(locale, "fields.caltransNote")} name="caltransDistrictNote" hint={t(locale, "city.contacts")} />
              <TextField label={t(locale, "fields.officialUrl")} name="officialUrl" />
              <TextArea label={t(locale, "fields.notes")} name="notes" required hint={t(locale, "city.noExtract")} />
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
