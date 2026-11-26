import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { SelectField } from "@/components/fields";
import { SignaturePad } from "@/components/signature-pad";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { CONSENT_BODY, employeeName } from "@/lib/sign/format";
import { prisma } from "@/lib/db";
import { getEmployee } from "@/lib/services/work";
import { enrollSignerAction, revokeSignerAction } from "@/server/sign-actions";

export const dynamic = "force-dynamic";

export default async function EnrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  if (actor.role === "WORKER") notFound();
  const person = await getEmployee(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const credential = await prisma.signerCredential.findFirst({
    where: { employeeId: person.id, organizationId: actor.organizationId },
    include: { consentText: true },
  });
  const active = credential && !credential.revokedAt;
  const name = employeeName(person);
  return (
    <div className="mx-auto max-w-[430px]">
      <p className="text-sm"><Link href={`/app/employees/${person.id}`}>{name}</Link></p>
      <h1 className="mt-2 font-serif text-3xl text-navy">{t(locale, "kiosk.enrollTitle")}</h1>
      <p className="note mt-4">{t(locale, "kiosk.paperOption")}</p>
      <p className="mt-3 text-sm">{t(locale, "kiosk.witness")} {actor.name}</p>
      {active ? (
        <div className="card mt-4">
          <p className="font-semibold">{t(locale, "kiosk.enrolled")}</p>
          <p className="mt-2 text-sm">{credential.consentText.version}</p>
          {actor.role === "ADMIN" ? (
            <form className="mt-4" action={revokeSignerAction.bind(null, person.id)}>
              <button className="btn-secondary min-h-14 w-full" type="submit">{t(locale, "kiosk.revoke")}</button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <ActionForm action={enrollSignerAction.bind(null, person.id)} submitLabel={t(locale, "kiosk.enrollTitle")}>
            <SelectField label={t(locale, "fields.language")} name="language" defaultValue={person.preferredLanguage === "es" ? "es" : "en"}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </SelectField>
            <article className="card text-sm leading-6">
              <p>{CONSENT_BODY.en}</p>
              <p className="mt-3">{CONSENT_BODY.es}</p>
            </article>
            <label className="flex min-h-14 items-start gap-3 text-base">
              <input className="mt-1 h-6 w-6" type="checkbox" name="agreed" value="yes" required />
              <span>{t(locale, "kiosk.agree")}</span>
            </label>
            <p className="text-lg font-semibold">{name}</p>
            <label className="block">
              <span className="label">{t(locale, "kiosk.printedName")}</span>
              <input className="input" name="printedName" required autoComplete="name" />
            </label>
            <SignaturePad label={t(locale, "kiosk.draw")} clearLabel={t(locale, "kiosk.clear")} />
            <label className="block">
              <span className="label">{t(locale, "kiosk.pinSet")}</span>
              <input className="input text-2xl tracking-widest" name="pin" inputMode="numeric" autoComplete="new-password" pattern="[0-9]*" minLength={4} maxLength={6} required />
            </label>
            <label className="block">
              <span className="label">{t(locale, "kiosk.pinConfirm")}</span>
              <input className="input text-2xl tracking-widest" name="confirmPin" inputMode="numeric" autoComplete="new-password" pattern="[0-9]*" minLength={4} maxLength={6} required />
            </label>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
