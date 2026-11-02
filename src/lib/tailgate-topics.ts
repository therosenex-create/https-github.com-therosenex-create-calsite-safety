import type { Locale } from "./i18n";

export const TAILGATE_TOPICS = [
  {
    code: "1541",
    citation: "8 CCR §1541",
    titleEn: "Trenching, Excavation & Cave-in Protection (§ 1541)",
    titleEs: "Zanjas, excavación y protección contra derrumbes (§ 1541)",
  },
  {
    code: "3395",
    citation: "8 CCR §3395",
    titleEn: "Heat Illness Prevention & Emergency Hydration (§ 3395)",
    titleEs: "Prevención de enfermedades por calor e hidratación de emergencia (§ 3395)",
  },
  {
    code: "1670",
    citation: "8 CCR §1670",
    titleEn: "Fall Protection & Personal Fall Arrest Systems (§ 1670)",
    titleEs: "Protección contra caídas y sistemas personales de detención (§ 1670)",
  },
  {
    code: "1509",
    citation: "8 CCR §1509",
    titleEn: "Code of Safe Practices & PPE Requirements (§ 1509)",
    titleEs: "Código de prácticas seguras y requisitos de EPP (§ 1509)",
  },
  {
    code: "1598",
    citation: "8 CCR §1598",
    titleEn: "Traffic Control & High-Visibility Garments (§ 1598)",
    titleEs: "Control de tráfico y prendas de alta visibilidad (§ 1598)",
  },
] as const;

export const TAILGATE_TOPIC_CODES = TAILGATE_TOPICS.map((topic) => topic.code) as [
  (typeof TAILGATE_TOPICS)[number]["code"],
  ...(typeof TAILGATE_TOPICS)[number]["code"][],
];

export function tailgateTopic(code: string) {
  return TAILGATE_TOPICS.find((topic) => topic.code === code) ?? null;
}

export function tailgateTopicLabel(locale: Locale, citation: string | null | undefined, fallback: string) {
  const topic = TAILGATE_TOPICS.find((item) => item.citation === citation);
  if (!topic) return fallback;
  return locale === "es" ? topic.titleEs : topic.titleEn;
}

export function tailgateCompliance(acknowledgments: { roleLabel: string; signedAt: Date | null }[]) {
  const attendees = acknowledgments.filter((row) => row.roleLabel === "attendee");
  const conductorSigned = acknowledgments.some((row) => row.roleLabel === "conductor" && row.signedAt);
  const signed = attendees.filter((row) => row.signedAt).length;
  const compliant = conductorSigned && attendees.length > 0 && signed === attendees.length;
  return { attendeeCount: attendees.length, signedCount: signed, conductorSigned, compliant };
}
