import { Shell } from "@/components/shell";
import { getActor, getLocale } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  return (
    <Shell actor={actor} locale={locale}>
      {children}
    </Shell>
  );
}
