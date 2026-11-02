import { ActionForm } from "@/components/action-form";
import { PageHeader, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getIipp } from "@/lib/services/regulatory";
import { updateIippAction } from "@/server/actions";

export default async function IippPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const program = await getIipp(actor);
  const canWrite = actor.role !== "WORKER";
  return (
    <div>
      <PageHeader title={t(locale, "nav.iipp")} subtitle={t(locale, "iipp.intro")} />
      <p className="note">{program.status === "TEMPLATE" ? t(locale, "iipp.template") : t(locale, "iipp.progress")}. {t(locale, "common.companyClaim")}</p>
      {program.implementationClaim ? <p className="card mt-4 text-sm">{program.implementationClaim}</p> : null}
      {canWrite ? (
        <div className="mt-4">
          <ActionForm action={updateIippAction} submitLabel={t(locale, "actions.save")}>
            {program.elements.map((element) => (
              <fieldset key={element.id} className="card space-y-3">
                <legend className="font-serif text-xl text-navy">{locale === "es" ? element.titleEs : element.titleEn}</legend>
                <p className="text-sm text-muted">{element.citation}</p>
                <TextField label={t(locale, "fields.responsibleName")} name={`responsible_${element.key}`} defaultValue={element.responsibleName} />
                <TextArea label={t(locale, "fields.description")} name={`procedure_${element.key}`} defaultValue={element.userProcedure} />
              </fieldset>
            ))}
            <TextArea label={t(locale, "fields.implementationClaim")} name="implementationClaim" defaultValue={program.implementationClaim} hint={t(locale, "hints.claim")} />
          </ActionForm>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {program.elements.map((element) => (
            <li key={element.id} className="card">
              <h2 className="font-semibold">{locale === "es" ? element.titleEs : element.titleEn}</h2>
              <p className="text-sm text-muted">{element.citation}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{element.userProcedure}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
