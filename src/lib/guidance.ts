import type { Locale } from "./i18n";

export type Guide = {
  slug: string;
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  paragraphs: Record<Locale, string[]>;
  requirementCodes: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "using-calsite",
    title: { en: "How to use CalSite Safety", es: "Cómo usar CalSite Safety" },
    summary: {
      en: "This is a record system. It is not a lawyer, an inspector, or an agency filing service.",
      es: "Este es un sistema de registros. No es un abogado, un inspector ni un servicio de presentación ante agencias.",
    },
    paragraphs: {
      en: [
        "Create a company, add the people who work for you, and open a project with the jobsite address, city, and county. Confirm those place names yourself. The app does not look up the building department or the fire authority.",
        "Record meetings, training, inspections, corrective actions, incidents, and files against that project. Archive a record when it should leave the active list. Archiving keeps the row and writes an audit event.",
        "The requirement catalog links to official pages and says what was actually reviewed. If a field says unknown or pending review, that is intentional.",
      ],
      es: [
        "Cree una empresa, agregue a las personas que trabajan con usted y abra un proyecto con la dirección, la ciudad y el condado del sitio. Confirme esos nombres usted mismo. La aplicación no busca el departamento de construcción ni la autoridad de bomberos.",
        "Registre reuniones, capacitación, inspecciones, acciones correctivas, incidentes y archivos en ese proyecto. Archive un registro cuando deba salir de la lista activa. Archivar conserva la fila y escribe un evento de auditoría.",
        "El catálogo de requisitos enlaza páginas oficiales y dice qué se revisó de verdad. Si un campo dice desconocido o pendiente de revisión, es a propósito.",
      ],
    },
    requirementCodes: [],
  },
  {
    slug: "iipp",
    title: { en: "Injury and Illness Prevention Program", es: "Programa de Prevención de Lesiones y Enfermedades" },
    summary: {
      en: "Section 3203 and construction section 1509 are in the catalog as partial summaries.",
      es: "Las secciones 3203 y 1509 de construcción están en el catálogo como resúmenes parciales.",
    },
    paragraphs: {
      en: [
        "The IIPP page is a template with the element headings taken from the DIR convenience copy of 8 CCR §3203 reviewed on November 2, 2026. You must name the real people and write the real procedures.",
        "A completed form is not proof that the program is effective or that every exception was considered. Construction section 1509 also points employers to section 3203 and adds a written code of safe practices and tailgate meetings. Read both catalog entries.",
        "DIR says its website copy is for convenience and does not warrant that it is current or accurate.",
      ],
      es: [
        "La página del IIPP es una plantilla con los encabezados tomados de la copia de conveniencia del DIR de 8 CCR §3203 revisada el 2 de noviembre de 2026. Usted debe nombrar a las personas reales y escribir los procedimientos reales.",
        "Un formulario completo no prueba que el programa sea eficaz ni que se consideró cada excepción. La sección 1509 de construcción también remite a la sección 3203 y añade un código escrito de prácticas seguras y charlas de seguridad. Lea ambas entradas del catálogo.",
        "El DIR dice que su copia en el sitio web es por conveniencia y no garantiza que esté vigente o sea exacta.",
      ],
    },
    requirementCodes: ["CCR-T8-3203", "CCR-T8-1509-PROGRAM", "CCR-T8-1509-CODE"],
  },
  {
    slug: "tailgate-meetings",
    title: { en: "Tailgate meetings", es: "Charlas de seguridad" },
    summary: {
      en: "Do not treat every employer as if the same meeting schedule were state law.",
      es: "No trate a cada empleador como si el mismo calendario de reuniones fuera ley estatal.",
    },
    paragraphs: {
      en: [
        "The catalog entry CCR-T8-1509-TAILGATE quotes one sentence from 8 CCR §1509(e): supervisory employees shall conduct toolbox or tailgate meetings, or equivalent, with their crews at least every 10 working days to emphasize safety.",
        "That sentence sits in the Construction Safety Orders. This app does not apply it outside that scope. A stricter company or contract schedule must be labeled as company policy or a contract requirement, not as state law.",
        "Attendance checkboxes record who was marked present. They are not notarized signatures.",
      ],
      es: [
        "La entrada CCR-T8-1509-TAILGATE cita una oración de 8 CCR §1509(e): los supervisores deben realizar reuniones de caja de herramientas o charlas, o un equivalente, con sus cuadrillas al menos cada 10 días laborables para enfatizar la seguridad.",
        "Esa oración está en las Órdenes de Seguridad en la Construcción. Esta aplicación no la aplica fuera de ese alcance. Un calendario más estricto de la empresa o del contrato debe etiquetarse como política de la empresa o requisito del contrato, no como ley estatal.",
        "Las casillas de asistencia registran a quién se marcó como presente. No son firmas notariadas.",
      ],
    },
    requirementCodes: ["CCR-T8-1509-TAILGATE"],
  },
  {
    slug: "heat-illness",
    title: { en: "Heat illness", es: "Enfermedad por calor" },
    summary: {
      en: "Outdoor and indoor heat sections were partially reviewed. Wildfire smoke was not.",
      es: "Se revisaron de forma parcial las secciones de calor en exteriores e interiores. El humo de incendios forestales no.",
    },
    paragraphs: {
      en: [
        "The outdoor heat entry summarizes triggers that appear in the retrieved copy of §3395, including water, shade when the temperature exceeds 80°F, and high-heat procedures at 95°F for listed industries that include construction. Exceptions and the rest of the section still have to be read.",
        "The indoor heat entry notes the 82°F scope sentence in §3396 and says the exceptions were not fully copied.",
        "A weather forecast is not a measurement of exposure. This release does not call a weather service.",
      ],
      es: [
        "La entrada de calor en exteriores resume detonantes que aparecen en la copia recuperada de §3395, incluida el agua, la sombra cuando la temperatura supera los 80°F y los procedimientos de calor alto a 95°F para industrias listadas que incluyen la construcción. Aún hay que leer las excepciones y el resto de la sección.",
        "La entrada de calor en interiores anota la oración de alcance de 82°F en §3396 y dice que las excepciones no se copiaron por completo.",
        "Un pronóstico del tiempo no es una medición de la exposición. Esta versión no consulta un servicio meteorológico.",
      ],
    },
    requirementCodes: ["CCR-T8-3395", "CCR-T8-3396"],
  },
  {
    slug: "fall-protection",
    title: { en: "Fall protection", es: "Protección contra caídas" },
    summary: {
      en: "Section 1670 states a 7 1/2 foot trigger for listed exposures. It is not a universal height.",
      es: "La sección 1670 establece un detonante de 7 1/2 pies para exposiciones listadas. No es una altura universal.",
    },
    paragraphs: {
      en: [
        "The catalog quotes the opening of §1670. Roofing section 1730 was read in part and uses different height language, including more than 20 feet for several slope cases. It is not the 7 1/2 foot sentence. Section 1731, which 1730 uses to exclude residential-type roofing, was not fetched.",
        "Do not enter a single company rule and label it as Title 8 for every task. Fall-protection plans and rescue plans that need a competent or qualified person are not generated here.",
      ],
      es: [
        "El catálogo cita el inicio de §1670. La sección 1730 de techado se leyó en parte y usa otro lenguaje de altura, incluido más de 20 pies para varios casos de pendiente. No es la oración de 7 1/2 pies. No se obtuvo la sección 1731, que la 1730 usa para excluir el techado de tipo residencial.",
        "No ingrese una sola regla de la empresa y la etiquete como Título 8 para cada tarea. Aquí no se generan planes de protección contra caídas ni de rescate que exijan una persona competente o calificada.",
      ],
    },
    requirementCodes: ["CCR-T8-1670"],
  },
  {
    slug: "excavation",
    title: { en: "Excavation and utilities", es: "Excavación y servicios subterráneos" },
    summary: {
      en: "Section 1541 was partially reviewed. A locate request does not prove every utility was found.",
      es: "La sección 1541 se revisó de forma parcial. Una solicitud de localización no prueba que se encontró cada servicio.",
    },
    paragraphs: {
      en: [
        "The stored excerpt covers the duty to determine approximate locations before opening an excavation and the conditions the retrieved text sets before excavation commences, including marking and positive responses. Later sentences, including high-priority installations, were truncated and are not treated as fully reviewed.",
        "Protective systems in §1541.1 are not in the catalog. This app does not tell you the soil is safe or that a permit has been issued.",
      ],
      es: [
        "El extracto guardado cubre el deber de determinar las ubicaciones aproximadas antes de abrir una excavación y las condiciones que el texto recuperado fija antes de comenzar, incluidas las marcas y las respuestas positivas. Las oraciones posteriores, incluidas las instalaciones de alta prioridad, se truncaron y no se tratan como revisadas por completo.",
        "Los sistemas de protección de §1541.1 no están en el catálogo. Esta aplicación no le dice que el suelo es seguro ni que se emitió un permiso.",
      ],
    },
    requirementCodes: ["CCR-T8-1541"],
  },
  {
    slug: "incidents",
    title: { en: "Incidents and reporting", es: "Incidentes y reportes" },
    summary: {
      en: "Record what happened. This app does not calculate an agency reporting deadline.",
      es: "Registre lo que ocurrió. Esta aplicación no calcula un plazo de reporte ante una agencia.",
    },
    paragraphs: {
      en: [
        "Injury, illness, near-miss, exposure, and property-damage reports stay in your company workspace. Workers see the incidents they created. Investigation notes are limited to admins and safety managers.",
        "If a report might trigger a duty to notify Cal/OSHA or another agency, confirm the controlling rule yourself. No deadline in this release is presented as a statutory reporting clock.",
        "Closing a report requires an investigation note. That note is not a legal conclusion.",
      ],
      es: [
        "Los reportes de lesión, enfermedad, casi accidente, exposición y daño a la propiedad permanecen en el espacio de su empresa. Los trabajadores ven los incidentes que crearon. Las notas de investigación se limitan a administradores y gerentes de seguridad.",
        "Si un reporte pudiera activar un deber de avisar a Cal/OSHA u otra agencia, confirme usted la regla aplicable. Ningún plazo de esta versión se presenta como un reloj legal de reporte.",
        "Cerrar un reporte exige una nota de investigación. Esa nota no es una conclusión legal.",
      ],
    },
    requirementCodes: ["CCR-T8-1512"],
  },
  {
    slug: "licensing-and-registration",
    title: { en: "Licenses and public works registration", es: "Licencias y registro de obras públicas" },
    summary: {
      en: "Store a number if you have one. The status stays at verification required until a person records a manual check, and even then it is not a live lookup.",
      es: "Guarde un número si lo tiene. El estado permanece en verificación requerida hasta que una persona registre una revisión manual, y aun así no es una consulta en vivo.",
    },
    paragraphs: {
      en: [
        "Official CSLB and DIR pages are in the source registry because their URLs responded. The registration and classification rules, fees, and renewal dates were not extracted from statute.",
        "There is no status called verified by CalSite. Expired, suspended, and similar labels appear only when someone on your team types them after their own check, and the screen still says the agency was not queried.",
      ],
      es: [
        "Las páginas oficiales de CSLB y DIR están en el registro de fuentes porque sus URL respondieron. No se extrajeron del estatuto las reglas de registro y clasificación, las tarifas ni las fechas de renovación.",
        "No hay un estado llamado verificado por CalSite. Las etiquetas de vencido, suspendido y similares aparecen solo cuando alguien de su equipo las escribe después de su propia revisión, y la pantalla sigue diciendo que no se consultó a la agencia.",
      ],
    },
    requirementCodes: ["CSLB-LICENSE-NUMBER", "DIR-PWCR-REGISTRATION"],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug) ?? null;
}
