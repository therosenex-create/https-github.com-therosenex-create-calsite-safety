import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { TextField } from "@/components/fields";
import { PublicHeader } from "@/components/shell";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { signInAction } from "@/server/actions";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/app");
  const locale = await getLocale();
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-serif text-3xl text-navy">{t(locale, "nav.signIn")}</h1>
        {process.env.DEMO_LOGIN_HINT === "true" ? <p className="note mt-4">{t(locale, "common.demoHint")}</p> : null}
        <div className="card mt-6">
          <ActionForm action={signInAction} submitLabel={t(locale, "nav.signIn")}>
            <TextField label={t(locale, "fields.email")} name="email" type="email" autoComplete="email" required />
            <TextField label={t(locale, "fields.password")} name="password" type="password" autoComplete="current-password" required />
          </ActionForm>
        </div>
      </main>
    </>
  );
}
