import { ActionForm } from "@/components/action-form";
import { PageHeader, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listCitySources } from "@/lib/services/records";
import { citySourceAction } from "@/server/actions";

export default async function JurisdictionsPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const sources = await listCitySources(actor);
  return (
    <div>
      <PageHeader title={t(locale, "nav.cities")} subtitle={t(locale, "city.empty")} />
      <ul className="space-y-3">
        {sources.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {sources.map((source) => (
          <li key={source.id} className="card text-sm">
            <p className="font-semibold">{source.cityName}, {source.countyName} · {source.subject}</p>
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
              <TextField label={t(locale, "fields.subject")} name="subject" required />
              <TextField label={t(locale, "fields.officialUrl")} name="officialUrl" />
              <TextArea label={t(locale, "fields.notes")} name="notes" required hint={t(locale, "city.noExtract")} />
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
