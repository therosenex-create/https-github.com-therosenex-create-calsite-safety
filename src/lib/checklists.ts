export const INSPECTION_CATEGORIES = [
  "general",
  "walking_surfaces",
  "fall_protection",
  "ladders",
  "scaffolds",
  "excavation",
  "electrical",
  "ppe",
  "housekeeping",
  "heat",
  "emergency",
  "other",
] as const;

export type InspectionCategory = (typeof INSPECTION_CATEGORIES)[number];

export type ChecklistPrompt = { key: string; en: string; es: string };

const prompts: Record<InspectionCategory, ChecklistPrompt[]> = {
  general: [
    { key: "access", en: "Is the work area accessible without an obvious uncontrolled hazard?", es: "¿El área de trabajo es accesible sin un peligro evidente y sin control?" },
    { key: "postings", en: "Are the postings the company expects on this site present and readable?", es: "¿Están presentes y legibles los avisos que la empresa espera en este sitio?" },
    { key: "crew", en: "Did the crew know who to call for this site in an emergency?", es: "¿La cuadrilla sabía a quién llamar en una emergencia en este sitio?" },
    { key: "changes", en: "Did today's work introduce a hazard that was not in the morning plan?", es: "¿El trabajo de hoy introdujo un peligro que no estaba en el plan de la mañana?" },
  ],
  walking_surfaces: [
    { key: "clear", en: "Are walkways clear of stored material, cords, and debris?", es: "¿Los pasillos están libres de material, cables y escombros?" },
    { key: "openings", en: "Are floor holes and openings covered or otherwise protected?", es: "¿Los huecos y aberturas del piso están cubiertos o protegidos?" },
    { key: "lighting", en: "Is there enough light to see the walking surface?", es: "¿Hay suficiente luz para ver la superficie de tránsito?" },
    { key: "wet", en: "Are wet or muddy surfaces addressed before people keep working?", es: "¿Se atendieron las superficies mojadas o con lodo antes de seguir trabajando?" },
  ],
  fall_protection: [
    { key: "assessed", en: "Was the fall exposure for this task discussed before work started?", es: "¿Se habló de la exposición a caídas de esta tarea antes de empezar?" },
    { key: "protection", en: "Is guardrail, cover, or personal fall protection in place where people are working?", es: "¿Hay baranda, cubierta o protección personal contra caídas donde están trabajando?" },
    { key: "equipment", en: "If personal fall protection is used, was it inspected before use?", es: "Si se usa protección personal contra caídas, ¿se inspeccionó antes de usarla?" },
    { key: "rescue", en: "If a harness is in use, is there a rescue plan the crew can describe?", es: "Si se usa arnés, ¿la cuadrilla puede describir un plan de rescate?" },
  ],
  ladders: [
    { key: "condition", en: "Are ladders in use free of obvious damage?", es: "¿Las escaleras en uso no tienen daño evidente?" },
    { key: "setup", en: "Are ladders set on a stable surface and used as the manufacturer describes?", es: "¿Las escaleras están en una superficie estable y se usan como indica el fabricante?" },
    { key: "three-point", en: "Are people keeping three points of contact while climbing?", es: "¿Las personas mantienen tres puntos de contacto al subir?" },
    { key: "reach", en: "Are people avoiding overreach from the ladder?", es: "¿Se evita estirarse demasiado desde la escalera?" },
  ],
  scaffolds: [
    { key: "tag", en: "Is there a record of who inspected this scaffold and when?", es: "¿Hay un registro de quién inspeccionó este andamio y cuándo?" },
    { key: "access", en: "Is there a safe way on and off the platform?", es: "¿Hay una forma segura de subir y bajar de la plataforma?" },
    { key: "planks", en: "Are platforms fully planked for the work being done?", es: "¿Las plataformas están completamente entabladas para el trabajo?" },
    { key: "changes", en: "Have alterations been made only by people the company authorizes?", es: "¿Los cambios los hicieron solo personas autorizadas por la empresa?" },
  ],
  excavation: [
    { key: "locate", en: "Is there a locate response, and has someone compared it to the marks in the field?", es: "¿Hay respuesta de localización y alguien la comparó con las marcas en el campo?" },
    { key: "protection", en: "Is there a protective system, sloping, or other plan for the depth and soil?", es: "¿Hay un sistema de protección, talud u otro plan para la profundidad y el suelo?" },
    { key: "access", en: "Is there a way in and out that does not require climbing the spoil pile?", es: "¿Hay entrada y salida que no exija trepar el material excavado?" },
    { key: "water", en: "Is water accumulating, and if so has work stopped for a new look?", es: "¿Se está acumulando agua y, si es así, se detuvo el trabajo para revisar?" },
  ],
  electrical: [
    { key: "gfci", en: "Are temporary receptacles in wet or outdoor construction use protected as the company requires?", es: "¿Los receptáculos temporales en uso mojado o exterior tienen la protección que exige la empresa?" },
    { key: "cords", en: "Are cords intact, off the ground where practical, and out of water?", es: "¿Los cables están intactos, fuera del piso cuando es práctico y lejos del agua?" },
    { key: "panels", en: "Are live parts covered, and are panel doors closed when not being worked on?", es: "¿Las partes energizadas están cubiertas y las puertas de tableros cerradas cuando no se trabaja en ellos?" },
    { key: "lines", en: "Have overhead and underground lines been identified for this task?", es: "¿Se identificaron las líneas aéreas y subterráneas para esta tarea?" },
  ],
  ppe: [
    { key: "assigned", en: "Does each person have the PPE this task calls for?", es: "¿Cada persona tiene el EPP que esta tarea requiere?" },
    { key: "condition", en: "Is that PPE intact and being worn?", es: "¿Ese EPP está intacto y se está usando?" },
    { key: "fit", en: "Did anyone report that PPE does not fit or interferes with the work?", es: "¿Alguien reportó que el EPP no le queda o estorba el trabajo?" },
    { key: "store", en: "Is spare PPE available if something is damaged today?", es: "¿Hay EPP de repuesto si algo se daña hoy?" },
  ],
  housekeeping: [
    { key: "debris", en: "Is scrap removed often enough that it is not a trip or fire hazard?", es: "¿Se retira el desecho con suficiente frecuencia para que no sea un riesgo de tropiezo o incendio?" },
    { key: "storage", en: "Are materials stacked so they will not fall onto a walkway?", es: "¿Los materiales están apilados para que no caigan sobre un pasillo?" },
    { key: "nails", en: "Are protruding nails bent or removed from scrap lumber?", es: "¿Los clavos salientes de la madera de desecho están doblados o retirados?" },
    { key: "waste", en: "Are oily rags and similar waste in a covered container?", es: "¿Los trapos con aceite y residuos similares están en un recipiente cubierto?" },
  ],
  heat: [
    { key: "water", en: "Is drinking water available, cool enough to drink, and close to the work?", es: "¿Hay agua potable, suficientemente fresca y cerca del trabajo?" },
    { key: "shade", en: "Is shade up and large enough for people who need a cool-down rest?", es: "¿Hay sombra instalada y suficiente para quien necesite un descanso para enfriarse?" },
    { key: "watch", en: "Is someone watching the crew for signs of heat illness?", es: "¿Alguien observa a la cuadrilla por signos de enfermedad por calor?" },
    { key: "plan", en: "Can the crew describe how they would get emergency help?", es: "¿La cuadrilla puede describir cómo conseguirían ayuda de emergencia?" },
  ],
  emergency: [
    { key: "number", en: "Is the site address and emergency number posted where the crew can see it?", es: "¿La dirección del sitio y el número de emergencia están donde la cuadrilla puede verlos?" },
    { key: "kit", en: "Is a first-aid kit present and stocked for today's crew?", es: "¿Hay un botiquín presente y abastecido para la cuadrilla de hoy?" },
    { key: "person", en: "Is there a person on site who can render first aid?", es: "¿Hay una persona en el sitio que pueda dar primeros auxilios?" },
    { key: "access", en: "Can an ambulance reach the work area?", es: "¿Una ambulancia puede llegar al área de trabajo?" },
  ],
  other: [
    { key: "task", en: "What task was observed?", es: "¿Qué tarea se observó?" },
    { key: "hazard", en: "What hazard was seen, if any?", es: "¿Qué peligro se vio, si hubo alguno?" },
    { key: "control", en: "What control was in place or missing?", es: "¿Qué control estaba en su lugar o faltaba?" },
    { key: "who", en: "Who will correct it, and by when?", es: "¿Quién lo corregirá y para cuándo?" },
  ],
};

export function promptsFor(category: string): ChecklistPrompt[] {
  if (category in prompts) return prompts[category as InspectionCategory];
  return prompts.other;
}

export const DOCUMENT_CATEGORIES = [
  "iipp",
  "code_of_safe_practices",
  "sds",
  "training",
  "inspection",
  "permit",
  "incident",
  "other",
] as const;
