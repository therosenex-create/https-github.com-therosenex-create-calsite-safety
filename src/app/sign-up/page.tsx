import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { TextField } from "@/components/fields";
import { PublicHeader } from "@/components/shell";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { signUpAction } from "@/server/actions";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/app");
  const locale = await getLocale();
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-serif text-3xl text-navy">{t(locale, "nav.signUp")}</h1>
        <p className="mt-2 text-sm text-muted">{t(locale, "hints.password")}</p>
        <div className="card mt-6">
          <ActionForm action={signUpAction} submitLabel={t(locale, "nav.signUp")}>
            <TextField label={t(locale, "fields.companyName")} name="companyName" required />
            <TextField label={t(locale, "fields.name")} name="name" autoComplete="name" required />
            <TextField label={t(locale, "fields.email")} name="email" type="email" autoComplete="email" required />
            <TextField label={t(locale, "fields.password")} name="password" type="password" autoComplete="new-password" required hint={t(locale, "hints.password")} />
            <TextField label={t(locale, "fields.confirmPassword")} name="confirmPassword" type="password" autoComplete="new-password" required />
          </ActionForm>
        </div>
      </main>
    </>
  );
}
