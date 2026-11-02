import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { TextField } from "@/components/fields";
import { PublicHeader, SkipLink } from "@/components/shell";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { signInAction } from "@/server/actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ revoked?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user && params.revoked !== "1") redirect("/app");
  const locale = await getLocale();
  return (
    <>
      <SkipLink locale={locale} />
      <PublicHeader locale={locale} />
      <main id="content" className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-serif text-3xl text-navy">{t(locale, "nav.signIn")}</h1>
        {params.revoked === "1" ? <p className="note mt-4">{t(locale, "security.revoked")}</p> : null}
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
