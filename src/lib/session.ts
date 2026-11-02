import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Actor } from "./actor";
import { prisma } from "./db";
import type { Locale } from "./i18n";

export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  return jar.get("locale")?.value === "es" ? "es" : "en";
});

export const getActor = cache(async (): Promise<Actor> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { organization: true, user: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) redirect("/sign-in");
  const jar = await cookies();
  const preferred = jar.get("calsite_org")?.value;
  const membership = memberships.find((item) => item.organizationId === preferred) ?? memberships[0];
  return {
    userId: membership.userId,
    organizationId: membership.organizationId,
    role: membership.role,
    email: membership.user.email,
    name: membership.user.name,
    organizationName: membership.organization.name,
    isDemonstration: membership.organization.isDemonstration,
  };
});

export async function getActorOrNull(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { organization: true, user: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;
  const jar = await cookies();
  const preferred = jar.get("calsite_org")?.value;
  const membership = memberships.find((item) => item.organizationId === preferred) ?? memberships[0];
  return {
    userId: membership.userId,
    organizationId: membership.organizationId,
    role: membership.role,
    email: membership.user.email,
    name: membership.user.name,
    organizationName: membership.organization.name,
    isDemonstration: membership.organization.isDemonstration,
  };
}
