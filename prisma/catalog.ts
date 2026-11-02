export const REVIEWED_ON = new Date("2026-11-02T00:00:00.000Z");

const DIR_LIMIT =
  "Partial summary of the DIR HTML convenience copy fetched on 2026-11-02. DIR says that copy is not warranted to be current or accurate: https://www.dir.ca.gov/od_pub/disclaimer.html. This is not legal advice. Penalties were not extracted.";

export const agencies = [
  { code: "DIR", name: "California Department of Industrial Relations", abbreviation: "DIR", websiteUrl: "https://www.dir.ca.gov/", level: "STATE" },
  { code: "DOSH", name: "Division of Occupational Safety and Health (Cal/OSHA)", abbreviation: "Cal/OSHA", websiteUrl: "https://www.dir.ca.gov/dosh/", level: "STATE" },
  { code: "CSLB", name: "Contractors State License Board", abbreviation: "CSLB", websiteUrl: "https://www.cslb.ca.gov/", level: "STATE" },
  { code: "LEGINFO", name: "California Legislative Information", abbreviation: "LegInfo", websiteUrl: "https://leginfo.legislature.ca.gov/", level: "STATE" },
  { code: "BSC", name: "California Building Standards Commission", abbreviation: "BSC", websiteUrl: "https://www.dgs.ca.gov/BSC", level: "STATE" },
  { code: "CALFIRE", name: "CAL FIRE", abbreviation: "CAL FIRE", websiteUrl: "https://www.fire.ca.gov/", level: "STATE" },
  { code: "WATER", name: "State Water Resources Control Board", abbreviation: "Water Boards", websiteUrl: "https://www.waterboards.ca.gov/", level: "STATE" },
  { code: "HCD", name: "Department of Housing and Community Development", abbreviation: "HCD", websiteUrl: "https://www.hcd.ca.gov/", level: "STATE" },
  { code: "CALTRANS", name: "California Department of Transportation", abbreviation: "Caltrans", websiteUrl: "https://dot.ca.gov/", level: "STATE" },
  { code: "CEC", name: "California Energy Commission", abbreviation: "CEC", websiteUrl: "https://www.energy.ca.gov/", level: "STATE" },
  { code: "ACCESS", name: "U.S. Access Board", abbreviation: "Access Board", websiteUrl: "https://www.access-board.gov/", level: "FEDERAL" },
] as const;

export const jurisdictions = [
  { code: "CA", name: "California", kind: "STATE", state: "CA" },
  { code: "US", name: "United States", kind: "FEDERAL", state: null },
] as const;

type Source = {
  code: string;
  agencyCode: string;
  jurisdictionCode: string;
  title: string;
  documentKind: "REGULATION" | "GUIDANCE" | "HOMEPAGE" | "EXPLANATORY";
  subject: string;
  officialUrl: string;
  reliability: "PRIMARY_STATUTE_OR_REGULATION" | "OFFICIAL_AGENCY_PUBLICATION" | "SECONDARY_REFERENCE";
  reviewStatus: "UNREVIEWED" | "PENDING_QUALIFIED_REVIEW" | "SOURCE_LINKED";
  isBinding: boolean;
  limitations: string;
  retrievalStatus: "URL_REACHABLE" | "FETCHED_PARTIAL" | "BLOCKED";
};

const reachable = (
  code: string,
  agencyCode: string,
  title: string,
  officialUrl: string,
  subject: string,
  kind: Source["documentKind"] = "HOMEPAGE",
): Source => ({
  code,
  agencyCode,
  jurisdictionCode: agencyCode === "ACCESS" ? "US" : "CA",
  title,
  documentKind: kind,
  subject,
  officialUrl,
  reliability: kind === "REGULATION" ? "PRIMARY_STATUTE_OR_REGULATION" : "OFFICIAL_AGENCY_PUBLICATION",
  reviewStatus: "UNREVIEWED",
  isBinding: false,
  limitations: "The URL responded during implementation on 2026-11-02. The page content was not reviewed and no duties were extracted from it.",
  retrievalStatus: "URL_REACHABLE",
});

export const sources: Source[] = [
  reachable("CSLB-HOME", "CSLB", "CSLB home", "https://www.cslb.ca.gov/", "Contractor licensing"),
  reachable("CSLB-CONTRACTORS", "CSLB", "CSLB contractors", "https://www.cslb.ca.gov/contractors/", "Contractor licensing"),
  reachable("CSLB-APPLICANTS", "CSLB", "CSLB applicants", "https://www.cslb.ca.gov/contractors/applicants/", "License applications"),
  reachable("CSLB-MAINTAIN", "CSLB", "Maintaining a CSLB license", "https://www.cslb.ca.gov/contractors/maintain_license/", "License maintenance"),
  reachable("CSLB-HIRE", "CSLB", "Hiring a contractor", "https://www.cslb.ca.gov/consumers/hire_a_contractor/", "Consumer hiring information"),
  reachable("DIR-HOME", "DIR", "DIR home", "https://www.dir.ca.gov/", "Labor and workplace oversight"),
  reachable("DOSH-HOME", "DOSH", "Cal/OSHA home", "https://www.dir.ca.gov/dosh/", "Occupational safety"),
  reachable("DOSH-CONSTRUCTION-GUIDE", "DOSH", "Cal/OSHA construction guide summary", "https://www.dir.ca.gov/dosh/Construction-guide-summary.html", "Construction guidance", "GUIDANCE"),
  reachable("DOSH-TRAINING-GUIDE", "DOSH", "Cal/OSHA training requirements publication", "https://www.dir.ca.gov/dosh/dosh_publications/trainingreq.htm", "Training guidance", "GUIDANCE"),
  reachable("DIR-PUBLIC-WORKS", "DIR", "DIR public works", "https://www.dir.ca.gov/public-works/", "Public works"),
  reachable("DIR-PW-CONTRACTORS", "DIR", "Public works contractors", "https://www.dir.ca.gov/Public-Works/Contractors.html", "Public works contractors"),
  reachable("DIR-PW-REGISTRATION", "DIR", "Public works contractor registration", "https://www.dir.ca.gov/Public-Works/Contractor-Registration.html", "Contractor registration"),
  reachable("DIR-PREVAILING-WAGE", "DIR", "Prevailing wage", "https://www.dir.ca.gov/public-works/prevailing-wage.html", "Prevailing wage"),
  reachable("DIR-DISCLAIMER", "DIR", "DIR website disclaimer", "https://www.dir.ca.gov/od_pub/disclaimer.html", "Source limitation", "EXPLANATORY"),
  reachable("BSC-HOME", "BSC", "Building Standards Commission", "https://www.dgs.ca.gov/BSC", "Building standards"),
  reachable("BSC-CODES", "BSC", "BSC codes", "https://www.dgs.ca.gov/BSC/codes", "Title 24"),
  reachable("HCD-HOME", "HCD", "HCD home", "https://www.hcd.ca.gov/", "Housing"),
  reachable("CALTRANS-HOME", "CALTRANS", "Caltrans home", "https://dot.ca.gov/", "Transportation"),
  reachable("CEC-HOME", "CEC", "California Energy Commission", "https://www.energy.ca.gov/", "Energy"),
  reachable("WATERBOARDS-HOME", "WATER", "State Water Resources Control Board", "https://www.waterboards.ca.gov/", "Water quality"),
  reachable("ACCESS-BOARD", "ACCESS", "U.S. Access Board", "https://www.access-board.gov/", "Federal accessibility"),
  {
    code: "T8-1730",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1730 Roof hazards",
    documentKind: "REGULATION",
    subject: "Roofing fall protection cross-reference",
    officialUrl: "https://www.dir.ca.gov/title8/1730.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Section 1731 (residential-type roofing), section 1510, and section 1724 were not extracted. The 20-foot sentences are not the §1670 7 1/2 foot rule and do not apply to every roof.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1541-1",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1541.1 Requirements for protective systems",
    documentKind: "REGULATION",
    subject: "Excavation protective systems",
    officialUrl: "https://www.dir.ca.gov/title8/1541_1.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Appendices and later design options were not fully extracted. The 5-foot and 1.5:1 figures are not the only rule in the section.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-5141-1",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §5141.1 Protection from wildfire smoke",
    documentKind: "REGULATION",
    subject: "Wildfire smoke",
    officialUrl: "https://www.dir.ca.gov/title8/5141_1.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Appendix B and section 5144 were not extracted. This app does not read the Air Quality Index.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1532-1",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1532.1 Lead",
    documentKind: "REGULATION",
    subject: "Construction lead",
    officialUrl: "https://www.dir.ca.gov/title8/1532_1.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Trigger tasks, medical surveillance, and most of the section were not extracted. Do not treat a missing hazard entry as proof that a material is lead-free.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "LEGINFO",
    agencyCode: "LEGINFO",
    jurisdictionCode: "CA",
    title: "California Legislative Information",
    documentKind: "HOMEPAGE",
    subject: "Statutes",
    officialUrl: "https://leginfo.legislature.ca.gov/",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "UNREVIEWED",
    isBinding: false,
    limitations: "A retrieval during implementation on 2026-11-02 returned HTTP 403. No statute text was downloaded. Do not treat this record as a reviewed law.",
    retrievalStatus: "BLOCKED",
  },
  {
    code: "CALFIRE-HOME",
    agencyCode: "CALFIRE",
    jurisdictionCode: "CA",
    title: "CAL FIRE home",
    documentKind: "HOMEPAGE",
    subject: "Fire",
    officialUrl: "https://www.fire.ca.gov/",
    reliability: "OFFICIAL_AGENCY_PUBLICATION",
    reviewStatus: "UNREVIEWED",
    isBinding: false,
    limitations: "A retrieval during implementation on 2026-11-02 returned HTTP 403. No fire-authority requirements were extracted.",
    retrievalStatus: "BLOCKED",
  },
  {
    code: "T8-3203",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §3203 Injury and Illness Prevention Program",
    documentKind: "REGULATION",
    subject: "Injury and illness prevention",
    officialUrl: "https://www.dir.ca.gov/title8/3203.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT,
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1509",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1509 Injury and Illness Prevention Program (Construction)",
    documentKind: "REGULATION",
    subject: "Construction IIPP and tailgates",
    officialUrl: "https://www.dir.ca.gov/title8/1509.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT,
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-3395",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §3395 Heat illness prevention in outdoor places of employment",
    documentKind: "REGULATION",
    subject: "Outdoor heat",
    officialUrl: "https://www.dir.ca.gov/title8/3395.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT,
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-3396",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §3396 Heat illness prevention in indoor places of employment",
    documentKind: "REGULATION",
    subject: "Indoor heat",
    officialUrl: "https://www.dir.ca.gov/title8/3396.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Exceptions were not fully copied.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1670",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1670 Personal fall arrest, restraint, and positioning",
    documentKind: "REGULATION",
    subject: "Fall protection",
    officialUrl: "https://www.dir.ca.gov/title8/1670.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " This is not a universal fall-protection height. The section itself points to other orders, including §1730 for roofing, which were not extracted.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1541",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1541 Excavation general requirements",
    documentKind: "REGULATION",
    subject: "Excavation",
    officialUrl: "https://www.dir.ca.gov/title8/1541.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Later sentences, including high-priority subsurface installations, were truncated. Section 1541.1 protective systems were not extracted. A locate response does not prove every utility was found.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1512",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1512 Emergency medical services",
    documentKind: "REGULATION",
    subject: "Emergency medical services",
    officialUrl: "https://www.dir.ca.gov/title8/1512.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Only the opening duties were reviewed.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
  {
    code: "T8-1532-3",
    agencyCode: "DOSH",
    jurisdictionCode: "CA",
    title: "8 CCR §1532.3 Respirable crystalline silica",
    documentKind: "REGULATION",
    subject: "Silica",
    officialUrl: "https://www.dir.ca.gov/title8/1532_3.html",
    reliability: "PRIMARY_STATUTE_OR_REGULATION",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    isBinding: true,
    limitations: DIR_LIMIT + " Table 1 tasks, medical surveillance, and the PEL were not fully extracted. Do not treat the action-level figure as the whole standard.",
    retrievalStatus: "FETCHED_PARTIAL",
  },
];

export type CatalogRequirement = {
  code: string;
  sourceCode: string;
  title: string;
  citation: string;
  plainLanguageEn: string;
  plainLanguageEs: string;
  officialExcerpt: string | null;
  scope: string;
  industry: string;
  activity: string;
  geographicScope: string;
  responsibleParty: string;
  deadlineOrTrigger: string;
  deadlineVerified: boolean;
  recurrence: string | null;
  reviewStatus: "PENDING_QUALIFIED_REVIEW" | "UNREVIEWED";
  limitations: string;
  legalAuthority: string;
  triggers: { description: string; statedInSource: boolean }[];
  exceptions: { description: string; partial: boolean }[];
  evidence: { name: string; description: string; statedInSource: boolean }[];
  rules: { description: string; result: "POTENTIALLY_APPLICABLE" | "PENDING_QUALIFIED_REVIEW" }[];
};

const base = {
  geographicScope: "California. Confirm that Title 8 applies to the specific workplace.",
  defaultApplicability: "POTENTIALLY_APPLICABLE" as const,
  consequencesNote: null as null,
};

export const requirements: CatalogRequirement[] = [
  {
    ...base,
    code: "CCR-T8-3203",
    sourceCode: "T8-3203",
    title: "Written Injury and Illness Prevention Program",
    citation: "8 CCR §3203",
    plainLanguageEn:
      "The DIR convenience copy reviewed on November 2, 2026 says that, effective July 1, 1991, every employer shall establish, implement, and maintain an effective written Injury and Illness Prevention Program. The copy lists minimum elements for responsibility, compliance, communication, hazard identification, injury and illness investigation, correction, training, and employee access, plus recordkeeping in subsection (b). Exceptions for some smaller employers were not fully copied.",
    plainLanguageEs:
      "La copia de conveniencia del DIR revisada el 2 de noviembre de 2026 dice que, a partir del 1 de julio de 1991, todo empleador debe establecer, implementar y mantener un Programa de Prevención de Lesiones y Enfermedades escrito y eficaz. La copia enumera elementos mínimos de responsabilidad, cumplimiento, comunicación, identificación de peligros, investigación, corrección, capacitación y acceso de los empleados, además del registro en el inciso (b). No se copiaron por completo las excepciones para algunos empleadores pequeños.",
    officialExcerpt:
      "Effective July 1, 1991, every employer shall establish, implement and maintain an effective Injury and Illness Prevention Program (Program). The Program shall be in writing.",
    scope: "The reviewed section is in the General Industry Safety Orders and is written as a duty of every employer. Whether each subsection applies to a particular employer was not determined.",
    industry: "Not limited to construction on the face of §3203. Construction section 1509 points to §3203.",
    activity: "Written program, responsibility, compliance, communication, inspections, investigations, correction, training, access, and records described in the section.",
    responsibleParty: "Employer",
    deadlineOrTrigger:
      "The retrieved copy states an effective date of July 1, 1991 for the written program. Subsection (b) of that copy says specified inspection and training records shall be maintained for at least one year, subject to exceptions that were not fully reproduced. Do not calculate a retention date from this summary.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Record-retention exceptions were truncated.",
    legalAuthority: "California Code of Regulations, Title 8, section 3203",
    triggers: [
      { description: "The retrieved text states the written-program duty effective July 1, 1991.", statedInSource: true },
      { description: "Subsection (a)(4) describes inspections when the program is first established, when new hazards are introduced, and when a new or unrecognized hazard becomes known. The full text of those triggers was not copied here.", statedInSource: true },
    ],
    exceptions: [
      { description: "The retrieved copy permits employers with fewer than 10 employees to meet subsection (a)(3) communication by specified oral instruction. Other exceptions exist and were not fully copied.", partial: true },
    ],
    evidence: [
      { name: "Written program", description: "The section says the program shall be in writing.", statedInSource: true },
      { name: "Inspection records", description: "Subsection (b) describes inspection records. Retention and exceptions were not fully copied.", statedInSource: true },
      { name: "Training documentation", description: "Subsection (b) describes training documentation. Retention and exceptions were not fully copied.", statedInSource: true },
    ],
    rules: [
      { description: "Treat as potentially applicable to a California employer until a qualified person confirms coverage and the current text.", result: "POTENTIALLY_APPLICABLE" },
    ],
  },
  {
    ...base,
    code: "CCR-T8-1509-PROGRAM",
    sourceCode: "T8-1509",
    title: "Construction employers and section 3203",
    citation: "8 CCR §1509(a)",
    plainLanguageEn:
      "Section 1509 is in the Construction Safety Orders. The retrieved copy says every employer shall establish, implement, and maintain an effective Injury and Illness Prevention Program in accordance with section 3203.",
    plainLanguageEs:
      "La sección 1509 está en las Órdenes de Seguridad en la Construcción. La copia recuperada dice que todo empleador debe establecer, implementar y mantener un Programa de Prevención de Lesiones y Enfermedades eficaz de acuerdo con la sección 3203.",
    officialExcerpt:
      "Every employer shall establish, implement and maintain an effective Injury and Illness Prevention Program in accordance with section 3203 of the General Industry Safety Orders.",
    scope: "Construction Safety Orders. Do not apply this section to work outside the scope of those orders without another source.",
    industry: "Construction, to the extent the Construction Safety Orders apply.",
    activity: "Maintaining an IIPP in accordance with section 3203.",
    responsibleParty: "Employer",
    deadlineOrTrigger: "No additional calendar deadline was extracted beyond the duty stated in the excerpt. Confirm section 3203 separately.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT,
    legalAuthority: "California Code of Regulations, Title 8, section 1509(a)",
    triggers: [{ description: "The subsection states the duty for every employer within this construction section.", statedInSource: true }],
    exceptions: [],
    evidence: [{ name: "IIPP records", description: "See section 3203. This subsection does not add a separate form.", statedInSource: false }],
    rules: [{ description: "Potentially applicable when the Construction Safety Orders apply. That scope was not fully mapped.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-1509-CODE",
    sourceCode: "T8-1509",
    title: "Code of Safe Practices",
    citation: "8 CCR §1509(b) and (c)",
    plainLanguageEn:
      "The retrieved copy says every employer shall adopt a written Code of Safe Practices related to the employer's operations, with language equivalent to the relevant parts of Plate A-3. It also says the code shall be posted at each jobsite office or given to each supervisory employee who shall have it readily available.",
    plainLanguageEs:
      "La copia recuperada dice que todo empleador debe adoptar un Código de Prácticas Seguras escrito relacionado con sus operaciones, con lenguaje equivalente a las partes pertinentes de la Plate A-3. También dice que el código debe publicarse en cada oficina del sitio o entregarse a cada supervisor, quien debe tenerlo disponible.",
    officialExcerpt:
      "Every employer shall adopt a written Code of Safe Practices which relates to the employer's operations.",
    scope: "Construction Safety Orders, subsections (b) and (c) as retrieved. Plate A-3 was not copied into this catalog.",
    industry: "Construction, to the extent those orders apply.",
    activity: "Adopting and posting or distributing a written code of safe practices.",
    responsibleParty: "Employer",
    deadlineOrTrigger: "No separate calendar deadline was extracted. Posting or distribution is described as part of the duty.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Plate A-3 was not reproduced.",
    legalAuthority: "California Code of Regulations, Title 8, section 1509(b)-(c)",
    triggers: [],
    exceptions: [],
    evidence: [{ name: "Written code of safe practices", description: "The retrieved text calls for a written code and for posting or providing it to supervisors.", statedInSource: true }],
    rules: [{ description: "Potentially applicable with section 1509. Plate A-3 still needs to be read.", result: "PENDING_QUALIFIED_REVIEW" }],
  },
  {
    ...base,
    code: "CCR-T8-1509-TAILGATE",
    sourceCode: "T8-1509",
    title: "Toolbox or tailgate meetings",
    citation: "8 CCR §1509(e)",
    plainLanguageEn:
      "The retrieved copy of section 1509(e) says supervisory employees shall conduct toolbox or tailgate safety meetings, or equivalent, with their crews at least every 10 working days to emphasize safety. Subsection (d) separately says periodic meetings of supervisory employees shall be held under the direction of management. This frequency is from the Construction Safety Orders. A company may adopt a stricter schedule, and that stricter schedule is company policy unless another source says otherwise.",
    plainLanguageEs:
      "La copia recuperada de la sección 1509(e) dice que los supervisores deben realizar reuniones de seguridad de caja de herramientas o charlas, o un equivalente, con sus cuadrillas al menos cada 10 días laborables para enfatizar la seguridad. El inciso (d) dice por separado que se celebren reuniones periódicas de supervisores bajo la dirección de la gerencia. Esta frecuencia proviene de las Órdenes de Seguridad en la Construcción. La empresa puede adoptar un calendario más estricto, y ese calendario es política de la empresa salvo que otra fuente diga lo contrario.",
    officialExcerpt:
      'Supervisory employees shall conduct "toolbox" or "tailgate" safety meetings, or equivalent, with their crews at least every 10 working days to emphasize safety.',
    scope: "Construction Safety Orders section 1509(e). Do not apply this 10-working-day sentence outside that scope without another controlling source.",
    industry: "Construction, to the extent the Construction Safety Orders apply.",
    activity: "Toolbox or tailgate meetings with crews, and the separate supervisory meetings in subsection (d).",
    responsibleParty: "Employer, through supervisory employees as the retrieved sentence describes.",
    deadlineOrTrigger: "The retrieved sentence says at least every 10 working days. It does not define how to count a working day for every schedule. Do not invent a calendar formula.",
    deadlineVerified: true,
    recurrence: "At least every 10 working days, as stated in the retrieved sentence of §1509(e), within the scope of that section.",
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Qualified review is still required before treating the frequency as settled for a particular employer.",
    legalAuthority: "California Code of Regulations, Title 8, section 1509(e)",
    triggers: [{ description: "Crew toolbox or tailgate meetings at least every 10 working days, per the retrieved sentence.", statedInSource: true }],
    exceptions: [],
    evidence: [{ name: "Meeting record", description: "The retrieved sentence requires the meetings. It does not prescribe a specific form. A company attendance sheet is evidence of what the company recorded, not a prescribed official form.", statedInSource: false }],
    rules: [{ description: "Potentially applicable to construction work covered by section 1509. Not a universal meeting rule for every California employer.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-3395",
    sourceCode: "T8-3395",
    title: "Outdoor heat illness prevention",
    citation: "8 CCR §3395",
    plainLanguageEn:
      "The retrieved copy says section 3395 applies to all outdoor places of employment and is known as the Maria Isabel Vasquez Jimenez heat illness standard. It lists construction among industries subject to all provisions, including high-heat procedures. The copy includes duties for drinking water, shade when the temperature exceeds 80 degrees Fahrenheit, high-heat procedures at 95 degrees Fahrenheit, emergency response, acclimatization, training before anticipated exposure, and a written plan in English and the language understood by the majority of employees. This summary does not replace the section.",
    plainLanguageEs:
      "La copia recuperada dice que la sección 3395 aplica a todos los lugares de empleo al aire libre y se conoce como la norma de enfermedad por calor Maria Isabel Vasquez Jimenez. Incluye la construcción entre las industrias sujetas a todas las disposiciones, incluidos los procedimientos de calor alto. La copia incluye deberes sobre agua potable, sombra cuando la temperatura supera los 80 grados Fahrenheit, procedimientos de calor alto a 95 grados Fahrenheit, respuesta de emergencia, aclimatación, capacitación antes de la exposición prevista y un plan escrito en inglés y en el idioma que entiende la mayoría de los empleados. Este resumen no reemplaza la sección.",
    officialExcerpt:
      "This section shall be known and may be cited as the Maria Isabel Vasquez Jimenez heat illness standard, and shall apply to all outdoor places of employment.",
    scope: "Outdoor places of employment, with subsection (e) high-heat procedures limited as the section describes.",
    industry: "The retrieved list in (a)(2) includes agriculture, construction, landscaping, oil and gas extraction, and specified transportation or delivery. Other industries are addressed by an exception to subsection (e) only.",
    activity: "Water, shade, high-heat procedures, emergency response, acclimatization, training, and a written heat illness prevention plan.",
    responsibleParty: "Employer",
    deadlineOrTrigger:
      "Retrieved triggers include shade when the outdoor temperature exceeds 80 degrees Fahrenheit and high-heat procedures when the temperature equals or exceeds 95 degrees Fahrenheit. Training is described as required before work that should reasonably be anticipated to result in exposure. These figures are not a complete statement of the section.",
    deadlineVerified: true,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " High-heat procedures do not apply to every industry. Read subsection (a).",
    legalAuthority: "California Code of Regulations, Title 8, section 3395",
    triggers: [
      { description: "Shade when the outdoor temperature in the work area exceeds 80 degrees Fahrenheit, as stated in the retrieved subsection (d).", statedInSource: true },
      { description: "High-heat procedures when the temperature equals or exceeds 95 degrees Fahrenheit, for industries subject to subsection (e).", statedInSource: true },
    ],
    exceptions: [
      { description: "The retrieved subsection (a)(1) says employers in industries not listed in (a)(2) are not required to comply with subsection (e), high-heat procedures. Other provisions may still apply.", partial: true },
    ],
    evidence: [
      { name: "Written heat illness prevention plan", description: "Subsection (i) of the retrieved copy requires a written plan in English and the language understood by the majority of employees.", statedInSource: true },
    ],
    rules: [{ description: "Construction is on the retrieved (a)(2) list, so outdoor construction is potentially subject to the whole standard, including high-heat procedures. Confirm the work is outdoor and read the exceptions.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-3396",
    sourceCode: "T8-3396",
    title: "Indoor heat illness prevention",
    citation: "8 CCR §3396",
    plainLanguageEn:
      "The retrieved copy says section 3396 applies to all indoor work areas where the temperature equals or exceeds 82 degrees Fahrenheit when employees are present. The same copy lists exceptions, including certain telework, some incidental exposures, and specified emergency operations. The exception text was not fully copied. Do not assume every indoor construction task is covered or excluded.",
    plainLanguageEs:
      "La copia recuperada dice que la sección 3396 aplica a todas las áreas de trabajo interiores donde la temperatura es igual o superior a 82 grados Fahrenheit cuando hay empleados presentes. La misma copia enumera excepciones, incluido cierto teletrabajo, algunas exposiciones incidentales y operaciones de emergencia especificadas. El texto de las excepciones no se copió por completo. No suponga que toda tarea de construcción en interiores está cubierta o excluida.",
    officialExcerpt:
      "This section applies to all indoor work areas where the temperature equals or exceeds 82 degrees Fahrenheit when employees are present.",
    scope: "Indoor work areas meeting the temperature condition, subject to exceptions that were not fully copied.",
    industry: "Not limited to construction on the face of the scope sentence.",
    activity: "Indoor heat illness prevention where the section applies.",
    responsibleParty: "Employer",
    deadlineOrTrigger: "The scope sentence uses 82 degrees Fahrenheit while employees are present. Other triggers inside the section were not fully extracted.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Exceptions were not fully copied, so deadlineVerified is false.",
    legalAuthority: "California Code of Regulations, Title 8, section 3396",
    triggers: [{ description: "Indoor temperature equals or exceeds 82 degrees Fahrenheit when employees are present, subject to exceptions.", statedInSource: true }],
    exceptions: [
      { description: "Retrieved exceptions include telework from a location of the employee's choice that is not under the employer's control, some incidental exposures under 15 minutes, and certain emergency operations. The list here is partial.", partial: true },
    ],
    evidence: [{ name: "Indoor heat procedures", description: "The full written-plan and control duties were not extracted.", statedInSource: false }],
    rules: [{ description: "Potentially applicable to indoor work at or above 82°F. Facts and exceptions are still required.", result: "PENDING_QUALIFIED_REVIEW" }],
  },
  {
    ...base,
    code: "CCR-T8-1670",
    sourceCode: "T8-1670",
    title: "Personal fall arrest, restraint, and positioning",
    citation: "8 CCR §1670",
    plainLanguageEn:
      "The retrieved opening of section 1670 says approved personal fall arrest, restraint, or positioning systems shall be worn by employees whose work exposes them to falling in excess of 7 1/2 feet from the perimeter of a structure, unprotected sides and edges, leading edges, through shaftways and openings, sloped roof surfaces steeper than 7:12, or other sloped surfaces steeper than 40 degrees not otherwise adequately protected. The same section says roofing fall protection is addressed in section 1730, which was not reviewed. This is not a universal fall-protection height for every task.",
    plainLanguageEs:
      "El inicio recuperado de la sección 1670 dice que los empleados cuyo trabajo los expone a caer más de 7 1/2 pies desde el perímetro de una estructura, lados y bordes desprotegidos, bordes de avance, a través de huecos y aberturas, techos con pendiente mayor de 7:12 u otras superficies con pendiente mayor de 40 grados que no estén protegidas de otro modo, deben usar sistemas aprobados de detención, restricción o posicionamiento. La misma sección dice que la protección contra caídas en techado se trata en la sección 1730, que no se revisó. Esta no es una altura universal de protección contra caídas para cada tarea.",
    officialExcerpt:
      "Approved personal fall arrest, personal fall restraint or positioning systems shall be worn by those employees whose work exposes them to falling in excess of 7 1/2 feet from the perimeter of a structure, unprotected sides and edges, leading edges, through shaftways and openings, sloped roof surfaces steeper than 7:12, or other sloped surfaces steeper than 40 degrees not otherwise adequately protected under the provisions of these Orders.",
    scope: "The listed exposures in section 1670. Other fall-protection sections are outside this entry.",
    industry: "Construction Safety Orders, Article 24, as labeled on the DIR page.",
    activity: "Work exposing employees to falling from the locations listed in the excerpt.",
    responsibleParty: "Employer. The section also describes equipment duties that were not fully extracted.",
    deadlineOrTrigger: "The 7 1/2 foot figure applies only to the exposures in the excerpt. It is not a universal height. No separate calendar deadline was extracted.",
    deadlineVerified: true,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Not a universal fall-protection height. Section 1730 and other referenced orders were not extracted.",
    legalAuthority: "California Code of Regulations, Title 8, section 1670",
    triggers: [{ description: "Fall exposure in excess of 7 1/2 feet from the locations listed in subsection (a), when not otherwise adequately protected.", statedInSource: true }],
    exceptions: [
      { description: "The retrieved notes point roofing to section 1730 and other work on poles and towers to other safety orders. Those sections were not reviewed.", partial: true },
    ],
    evidence: [{ name: "Equipment and task record", description: "The catalog does not state a specific form. A company inspection note is not a certification of the system.", statedInSource: false }],
    rules: [{ description: "Potentially applicable only to the exposures in §1670(a). Do not use it as the rule for every elevated task.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-1541",
    sourceCode: "T8-1541",
    title: "Excavation general requirements",
    citation: "8 CCR §1541",
    plainLanguageEn:
      "The retrieved copy of section 1541 says surface encumbrances that create a hazard shall be removed or supported, and that the approximate location of subsurface installations that may reasonably be expected shall be determined before opening an excavation. It also says excavation shall not commence until the area has been marked as specified in Government Code section 4216.2 and the excavator has received a positive response from all known owners/operators. The rest of the section, including later high-priority installation sentences, was not fully reviewed. A locate response does not by itself prove that every utility was found or that digging is safe.",
    plainLanguageEs:
      "La copia recuperada de la sección 1541 dice que los estorbos en la superficie que crean un peligro deben retirarse o sostenerse, y que la ubicación aproximada de las instalaciones subterráneas que sea razonable esperar debe determinarse antes de abrir una excavación. También dice que la excavación no debe comenzar hasta que el área se haya marcado como especifica la sección 4216.2 del Código de Gobierno y el excavador haya recibido una respuesta positiva de todos los propietarios u operadores conocidos. El resto de la sección, incluidas oraciones posteriores sobre instalaciones de alta prioridad, no se revisó por completo. Una respuesta de localización no prueba por sí sola que se encontró cada servicio ni que excavar es seguro.",
    officialExcerpt:
      "The approximate location of subsurface installations, such as sewer, telephone, fuel, electric, water lines, or any other subsurface installations that reasonably may be expected to be encountered during excavation work, shall be determined by the excavator prior to opening an excavation.",
    scope: "Construction Safety Orders, excavation general requirements. Protective-system section 1541.1 is not included.",
    industry: "Excavation work covered by these orders.",
    activity: "Surface encumbrances, subsurface location, marking, and positive responses before opening an excavation.",
    responsibleParty: "The retrieved text assigns location duties to the excavator and is an employer standard. Which company is the excavator on a multi-employer site was not determined.",
    deadlineOrTrigger: "Before opening an excavation, for the location duty in the excerpt. Statutory notice periods in Government Code 4216 were not retrieved because the legislative site returned HTTP 403.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Government Code 4216 was not retrieved. Section 1541.1 was not extracted.",
    legalAuthority: "California Code of Regulations, Title 8, section 1541",
    triggers: [{ description: "Before opening an excavation, determine approximate locations of subsurface installations that may reasonably be expected.", statedInSource: true }],
    exceptions: [],
    evidence: [{ name: "Locate response and marks", description: "The retrieved text refers to marking and positive responses. Keep the actual responses. They do not prove every line was found.", statedInSource: true }],
    rules: [{ description: "Potentially applicable when the work is an excavation covered by the Construction Safety Orders. Depth, soil, and protective-system rules are not decided by this entry.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-1512",
    sourceCode: "T8-1512",
    title: "Emergency medical services on construction sites",
    citation: "8 CCR §1512",
    plainLanguageEn:
      "The retrieved opening says that where more than one employer is on a construction site, each employer is responsible to ensure emergency medical services for its employees. Employers may agree to provide access for the combined workforce, and only one program need be established if it is adequate for that workforce. Each employer shall ensure a suitable number of appropriately trained persons to render first aid, with a pooling option. The rest of the section, including any specific training content, was not fully extracted. No reporting deadline to Cal/OSHA was calculated.",
    plainLanguageEs:
      "El inicio recuperado dice que cuando hay más de un empleador en un sitio de construcción, cada empleador es responsable de asegurar servicios médicos de emergencia para sus empleados. Los empleadores pueden acordar el acceso para la fuerza de trabajo combinada, y solo se necesita un programa si es adecuado para esa fuerza de trabajo. Cada empleador debe asegurar un número adecuado de personas capacitadas para dar primeros auxilios, con opción de agruparlas. El resto de la sección, incluido cualquier contenido específico de capacitación, no se extrajo por completo. No se calculó ningún plazo de reporte a Cal/OSHA.",
    officialExcerpt:
      "Where more than one employer is involved in a single construction project on a given construction site, each employer is responsible to ensure the availability of emergency medical services for its employees.",
    scope: "Construction sites under section 1512. The full section was not copied.",
    industry: "Construction.",
    activity: "Emergency medical services and availability of people who can render first aid.",
    responsibleParty: "Each employer for its employees, with the shared-program option described in the excerpt.",
    deadlineOrTrigger: "No calendar deadline was extracted. 'A suitable number' was not converted into a headcount.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT,
    legalAuthority: "California Code of Regulations, Title 8, section 1512",
    triggers: [],
    exceptions: [{ description: "The retrieved text has an exception for certain engineering contractors or service providers not engaged in construction activity. It was not fully copied.", partial: true }],
    evidence: [{ name: "First-aid coverage note", description: "A company note of who can render first aid is a record of what the company arranged. It is not a certification of the training.", statedInSource: false }],
    rules: [{ description: "Potentially applicable on a construction site. Multi-employer arrangements still need to be documented by the companies involved.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-1532-3",
    sourceCode: "T8-1532-3",
    title: "Respirable crystalline silica in construction",
    citation: "8 CCR §1532.3",
    plainLanguageEn:
      "The retrieved scope sentence says the section applies to all occupational exposures to respirable crystalline silica in construction work, except where employee exposure will remain below 25 micrograms per cubic meter of air as an 8-hour time-weighted average under any foreseeable conditions. The copy defines the action level as that same 25 microgram figure and defines a competent person for this section. Table 1, the PEL, medical surveillance, and most control duties were not fully extracted.",
    plainLanguageEs:
      "La oración de alcance recuperada dice que la sección aplica a todas las exposiciones ocupacionales a sílice cristalina respirable en el trabajo de construcción, excepto cuando la exposición del empleado permanecerá por debajo de 25 microgramos por metro cúbico de aire como promedio ponderado de 8 horas en cualquier condición previsible. La copia define el nivel de acción con esa misma cifra de 25 microgramos y define una persona competente para esta sección. No se extrajeron por completo la Tabla 1, el PEL, la vigilancia médica ni la mayoría de los deberes de control.",
    officialExcerpt:
      "This section applies to all occupational exposures to respirable crystalline silica in construction work, except where employee exposure will remain below 25 micrograms per cubic meter of air (25 μg/m3) as an 8-hour time-weighted average (TWA) under any foreseeable conditions.",
    scope: "Construction exposures to respirable crystalline silica, subject to the exposure exception in the excerpt.",
    industry: "Construction work.",
    activity: "Tasks that may create occupational exposure to respirable crystalline silica.",
    responsibleParty: "Employer. The competent-person definition was seen but the full list of competent-person duties was not extracted.",
    deadlineOrTrigger: "No calendar deadline was extracted. The 25 μg/m3 figure is the scope exception and the defined action level in the text that was read. It is not a complete exposure-limit statement.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " PEL and Table 1 were not fully extracted.",
    legalAuthority: "California Code of Regulations, Title 8, section 1532.3",
    triggers: [{ description: "Occupational exposure to respirable crystalline silica in construction, unless the stated exposure exception applies.", statedInSource: true }],
    exceptions: [{ description: "Exposure remaining below 25 μg/m3 as an 8-hour TWA under any foreseeable conditions, as stated in the scope sentence.", partial: true }],
    evidence: [{ name: "Exposure assessment or Table 1 record", description: "Expected in a silica program, but the controlling subsections were not fully extracted, so this catalog does not state the exact record.", statedInSource: false }],
    rules: [{ description: "Potentially applicable to construction tasks that disturb silica-containing materials. Do not assume a material is silica-free because nobody entered a hazard.", result: "PENDING_QUALIFIED_REVIEW" }],
  },
  {
    ...base,
    code: "CSLB-LICENSE-NUMBER",
    sourceCode: "CSLB-MAINTAIN",
    title: "CSLB license number on file",
    citation: "CSLB maintain-license page (not a statute extract)",
    plainLanguageEn:
      "CSLB publishes pages about applying for and maintaining a contractor license. This catalog does not state who must be licensed, which classification is authorized, the renewal date, or the bond amount. A license number saved in CalSite is not evidence that the license is active. The status remains verification required until a person records their own manual check, and that check is still not a live CSLB lookup.",
    plainLanguageEs:
      "CSLB publica páginas sobre solicitar y mantener una licencia de contratista. Este catálogo no dice quién debe tener licencia, qué clasificación está autorizada, la fecha de renovación ni el monto de la fianza. Un número de licencia guardado en CalSite no es prueba de que la licencia esté activa. El estado permanece en verificación requerida hasta que una persona registre su propia revisión manual, y esa revisión sigue sin ser una consulta en vivo a CSLB.",
    officialExcerpt: null,
    scope: "Unknown. The maintain-license page was not reviewed as law.",
    industry: "Unknown.",
    activity: "Keeping a record of a license number the company typed in.",
    geographicScope: "California contractor licensing. Coverage was not determined.",
    responsibleParty: "Unknown — not verified in this catalog.",
    deadlineOrTrigger: "Unknown. No renewal interval was extracted.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "UNREVIEWED",
    limitations: "URL https://www.cslb.ca.gov/contractors/maintain_license/ responded on 2026-11-02. Content was not reviewed. Do not infer license duties from this entry.",
    legalAuthority: "Not extracted. See the CSLB site and the Business and Professions Code, which was not retrieved.",
    triggers: [],
    exceptions: [],
    evidence: [{ name: "Manual lookup note", description: "A note that a person looked at the official CSLB site. It does not prove the license is valid.", statedInSource: false }],
    rules: [{ description: "Leave applicability pending until someone reviews the official source for this business.", result: "PENDING_QUALIFIED_REVIEW" }],
  },
  {
    ...base,
    code: "DIR-PWCR-REGISTRATION",
    sourceCode: "DIR-PW-REGISTRATION",
    title: "DIR public works contractor registration",
    citation: "DIR contractor-registration page (not a statute extract)",
    plainLanguageEn:
      "DIR publishes a public works contractor registration page. This catalog does not state when registration is required, the fee, the term, or the consequence of bidding without it. A registration number typed into CalSite is not eligibility. Public-works coverage itself depends on facts that this entry does not decide.",
    plainLanguageEs:
      "El DIR publica una página de registro de contratistas de obras públicas. Este catálogo no dice cuándo se exige el registro, la tarifa, el plazo ni la consecuencia de ofertar sin él. Un número de registro escrito en CalSite no es elegibilidad. La cobertura de obra pública depende de hechos que esta entrada no decide.",
    officialExcerpt: null,
    scope: "Unknown. The registration page content was not reviewed.",
    industry: "Unknown.",
    activity: "Recording a registration number and a manual check.",
    geographicScope: "California public works. The legal definition was not extracted.",
    responsibleParty: "Unknown — not verified in this catalog.",
    deadlineOrTrigger: "Unknown. No renewal date was extracted.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "UNREVIEWED",
    limitations: "URL https://www.dir.ca.gov/Public-Works/Contractor-Registration.html responded on 2026-11-02. Content was not reviewed. No wage rate, fee, or deadline is stated.",
    legalAuthority: "Not extracted.",
    triggers: [],
    exceptions: [],
    evidence: [{ name: "Manual registration check", description: "A dated note of what a person saw on the official page. It is not an agency confirmation inside this app.", statedInSource: false }],
    rules: [{ description: "If the project owner might be a public agency or school, mark the project question pending qualified review. Do not mark the contractor eligible from a number alone.", result: "PENDING_QUALIFIED_REVIEW" }],
  },
  {
    ...base,
    code: "CCR-T8-1730",
    sourceCode: "T8-1730",
    title: "Roof hazards during roofing operations",
    citation: "8 CCR §1730",
    plainLanguageEn:
      "The DIR convenience copy of section 1730 says that during roofing operations the employer shall comply with section 1509 and employees shall be trained and instructed under section 1510. It says this section does not apply to residential-type roofing activities as defined in section 1731. For the single-unit and multiple-unit slopes that were read, the copy repeatedly says employees shall be protected from falls from roofs of a height of more than 20 feet, and subsection (g) says that height is the vertical distance from the walking/working surface to the level below, not counting parapet height. Felt-laying machines pulled by an operator who walks backwards are called out separately, including a provision that applies regardless of height on low slopes. This is not the 7 1/2 foot trigger in section 1670. Sections 1731, 1510, and 1724 were not extracted.",
    plainLanguageEs:
      "La copia de conveniencia del DIR de la sección 1730 dice que durante operaciones de techado el empleador debe cumplir la sección 1509 y que los empleados deben capacitarse según la sección 1510. Dice que esta sección no aplica a actividades de techado de tipo residencial definidas en la sección 1731. Para las pendientes de cubierta de una unidad y de varias unidades que se leyeron, la copia dice repetidamente que los empleados deben protegerse de caídas desde techos de más de 20 pies de altura, y el inciso (g) dice que esa altura es la distancia vertical desde la superficie de tránsito hasta el nivel de abajo, sin contar la altura del parapeto. Las máquinas de fieltro arrastradas por un operador que camina hacia atrás se tratan aparte, incluida una disposición que aplica sin importar la altura en pendientes bajas. Esto no es el detonante de 7 1/2 pies de la sección 1670. No se extrajeron las secciones 1731, 1510 ni 1724.",
    officialExcerpt:
      "Employees shall be protected from falls from roofs of a height of more than 20 feet by use of one or a combination of the methods in this section.",
    scope: "Roofing operations under section 1730, excluding residential-type roofing as defined in section 1731, which was not read.",
    industry: "Roofing covered by this construction section. Not every elevated task.",
    activity: "Fall protection on roofs, by slope and roof covering, using the methods named in the section.",
    responsibleParty: "Employer",
    deadlineOrTrigger:
      "The retrieved copy uses a height of more than 20 feet in the slope subsections that were read, measured under subsection (g). On slopes 0:12 to 4:12, equipment pulled by an operator who walks backwards makes that low-slope provision apply regardless of height. Do not use 20 feet as the rule for residential-type roofing under section 1731 or for section 1670.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Not the §1670 7 1/2 foot rule. Section 1731 was not fetched. Warning-line details and cross-references to §1724 were not fully copied.",
    legalAuthority: "California Code of Regulations, Title 8, section 1730",
    triggers: [{ description: "Roof height of more than 20 feet in the slope subsections that were read, with a separate regardless-of-height provision for certain backward-walking equipment on low slopes.", statedInSource: true }],
    exceptions: [{ description: "The retrieved subsection (a) says the section does not apply to residential-type roofing activities as defined in section 1731. Section 1731 was not reviewed.", partial: true }],
    evidence: [{ name: "Roof work plan", description: "The section names methods. It does not prescribe a CalSite form. A company note is not a qualified-person certification.", statedInSource: false }],
    rules: [{ description: "Potentially applicable to non-residential roofing operations. Confirm the slope, covering, and whether section 1731 applies before using any height figure.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-1541-1",
    sourceCode: "T8-1541-1",
    title: "Excavation protective systems",
    citation: "8 CCR §1541.1",
    plainLanguageEn:
      "The retrieved copy says each employee in an excavation shall be protected from cave-ins by an adequate protective system designed under subsection (b) or (c), except when the excavation is made entirely in stable rock, or is less than 5 feet deep and a competent person examines the ground and finds no indication of a potential cave-in. Option 1 says excavations shall be sloped at an angle not steeper than one and one-half horizontal to one vertical (34 degrees), unless the employer uses another listed option, and those slopes follow the Type C configurations in Appendix B. Other options, including appendices and tabulated data, were not fully extracted. The 5-foot and 1.5:1 figures are not the only rule.",
    plainLanguageEs:
      "La copia recuperada dice que cada empleado en una excavación debe protegerse de derrumbes con un sistema de protección adecuado diseñado según el inciso (b) o (c), excepto cuando la excavación está hecha por completo en roca estable, o tiene menos de 5 pies de profundidad y una persona competente examina el terreno y no encuentra indicios de un posible derrumbe. La opción 1 dice que las excavaciones deben tener un talud no más empinado que uno y medio horizontal por uno vertical (34 grados), salvo que el empleador use otra opción listada, y esos taludes siguen las configuraciones de suelo tipo C del Apéndice B. No se extrajeron por completo otras opciones, incluidos los apéndices y los datos tabulados. Las cifras de 5 pies y 1.5:1 no son la única regla.",
    officialExcerpt:
      "Each employee in an excavation shall be protected from cave-ins by an adequate protective system designed in accordance with Section 1541.1(b) or (c) except when: (A) Excavations are made entirely in stable rock; or (B) Excavations are less than 5 feet in depth and examination of the ground by a competent person provides no indication of a potential cave-in.",
    scope: "Employees in excavations under section 1541.1. This does not replace section 1541 utility-location duties.",
    industry: "Excavation covered by the Construction Safety Orders.",
    activity: "Cave-in protection, sloping, benching, and other protective-system design options.",
    responsibleParty: "Employer. The retrieved text also assigns slope selection to the employer or the employer's designee, and a competent-person examination appears in the under-5-foot exception.",
    deadlineOrTrigger: "Before employees are in the excavation, for the protection duty in the excerpt. No calendar deadline was extracted. Do not treat 5 feet or 34 degrees as sufficient for every soil and every option.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " Appendices A and B and later design options were not fully copied. The 5-foot and 1.5:1 figures are not the only rule. A locate request under section 1541 does not satisfy this section.",
    legalAuthority: "California Code of Regulations, Title 8, section 1541.1",
    triggers: [{ description: "Employees in an excavation, unless one of the two exceptions in subsection (a)(1) is met.", statedInSource: true }],
    exceptions: [{ description: "Stable rock, or less than 5 feet with a competent-person examination that finds no indication of a potential cave-in. Other exceptions were not fully copied.", partial: true }],
    evidence: [{ name: "Protective-system selection", description: "Option 1 points to Appendix B. A company note of the option used is not an engineering certification.", statedInSource: false }],
    rules: [{ description: "Potentially applicable to excavation work. The protective-system choice depends on depth, soil, and which option the employer actually uses.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-5141-1",
    sourceCode: "T8-5141-1",
    title: "Protection from wildfire smoke",
    citation: "8 CCR §5141.1",
    plainLanguageEn:
      "The retrieved copy says section 5141.1 applies where the current Air Quality Index for PM2.5 is 151 or greater, regardless of the AQI for other pollutants, and the employer should reasonably anticipate that employees may be exposed to wildfire smoke. The copy lists exemptions for certain filtered buildings and vehicles, a worksite measurement showing the concentration does not exceed a current AQI of 151, exposure totaling one hour or less in a shift, and firefighters engaged in wildland firefighting. It also says the employer shall determine exposure at the start of each shift by checking specified AQI sources or by measuring, shall communicate hazards in a readily understandable language, and shall use engineering controls to reduce exposure below a current AQI of 151 when feasible. A retrieved sentence says respirator use is required where the current AQI for PM2.5 exceeds 500. This app does not check the AQI. Appendix B and section 5144 were not extracted.",
    plainLanguageEs:
      "La copia recuperada dice que la sección 5141.1 aplica cuando el índice de calidad del aire actual para PM2.5 es 151 o mayor, sin importar el AQI de otros contaminantes, y el empleador debería prever razonablemente que los empleados pueden estar expuestos al humo de incendios forestales. La copia enumera exenciones para ciertos edificios y vehículos con aire filtrado, una medición en el sitio que muestre que la concentración no supera un AQI actual de 151, una exposición total de una hora o menos en un turno, y bomberos en combate de incendios forestales. También dice que el empleador debe determinar la exposición al inicio de cada turno consultando fuentes de AQI especificadas o midiendo, comunicar los peligros en un idioma comprensible, y usar controles de ingeniería para reducir la exposición por debajo de un AQI actual de 151 cuando sea factible. Una oración recuperada dice que el uso de respirador es obligatorio cuando el AQI actual para PM2.5 supera 500. Esta aplicación no consulta el AQI. No se extrajeron el Apéndice B ni la sección 5144.",
    officialExcerpt:
      "This section applies to workplaces where: (A) The current Air Quality Index (current AQI) for PM2.5 is 151 or greater, regardless of the AQI for other pollutants; and (B) The employer should reasonably anticipate that employees may be exposed to wildfire smoke.",
    scope: "Workplaces meeting both scope conditions, subject to the exemptions in subsection (a)(2).",
    industry: "Not limited to construction on the face of the scope. Construction outdoors can fall inside it when the conditions are met.",
    activity: "Identifying PM2.5 exposure from wildfire smoke and applying the controls in the section.",
    responsibleParty: "Employer",
    deadlineOrTrigger:
      "Current AQI for PM2.5 of 151 or greater, plus a reasonable anticipation of wildfire-smoke exposure, for the scope. Exposure determination at the start of each shift for covered worksites. Respirator use where the current AQI for PM2.5 exceeds 500, in the sentence that was read. This app does not calculate or retrieve the AQI.",
    deadlineVerified: true,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " A forecast or an AQI website is not a measurement this app performs. Section 5144 and Appendix B were not extracted.",
    legalAuthority: "California Code of Regulations, Title 8, section 5141.1",
    triggers: [
      { description: "Current AQI for PM2.5 is 151 or greater and the employer should reasonably anticipate wildfire-smoke exposure.", statedInSource: true },
      { description: "Where the current AQI for PM2.5 exceeds 500, the retrieved copy says respirator use is required.", statedInSource: true },
    ],
    exceptions: [{ description: "Filtered enclosed buildings and vehicles, a compliant worksite measurement, exposure of one hour or less in a shift, and wildland firefighters, as listed in the retrieved subsection (a)(2).", partial: true }],
    evidence: [{ name: "AQI check record", description: "The section describes how the employer determines exposure. A note in this app is the company's record, not an air-quality measurement.", statedInSource: false }],
    rules: [{ description: "Potentially applicable when outdoor work may meet the AQI and wildfire-smoke conditions. Those facts are not known until someone checks a source the section names.", result: "POTENTIALLY_APPLICABLE" }],
  },
  {
    ...base,
    code: "CCR-T8-1532-1",
    sourceCode: "T8-1532-1",
    title: "Lead in construction",
    citation: "8 CCR §1532.1",
    plainLanguageEn:
      "The retrieved copy says section 1532.1 applies to all construction work where an employee may be occupationally exposed to lead, including work excluded from the general-industry lead standard by section 5198(a)(2). The definitions that were read set an action level of 2 micrograms per cubic meter as an 8-hour time-weighted average, without regard to respirator use. Subsection (c) that was read says the employer shall ensure that no employee is exposed to an airborne concentration of lead greater than 10 micrograms per cubic meter as an 8-hour TWA, and it includes an abrasive-blasting exception until January 1, 2030 at 25 micrograms per cubic meter that was not copied in full. Trigger tasks, medical surveillance, and most of the section were not extracted. Do not treat a blank hazard entry as proof that a material is lead-free.",
    plainLanguageEs:
      "La copia recuperada dice que la sección 1532.1 aplica a todo trabajo de construcción en el que un empleado pueda estar expuesto ocupacionalmente al plomo, incluido el trabajo excluido de la norma general de plomo por la sección 5198(a)(2). Las definiciones leídas fijan un nivel de acción de 2 microgramos por metro cúbico como promedio ponderado de 8 horas, sin considerar el uso de respirador. El inciso (c) leído dice que el empleador debe asegurar que ningún empleado esté expuesto a una concentración de plomo en el aire mayor de 10 microgramos por metro cúbico como TWA de 8 horas, e incluye una excepción de chorro abrasivo hasta el 1 de enero de 2030 a 25 microgramos por metro cúbico que no se copió completa. No se extrajeron las tareas detonantes, la vigilancia médica ni la mayor parte de la sección. No trate un campo de peligro vacío como prueba de que un material no tiene plomo.",
    officialExcerpt:
      "This section applies to all construction work where an employee may be occupationally exposed to lead.",
    scope: "Construction work with possible occupational lead exposure, as stated in the scope sentence. Section 5198 was not extracted.",
    industry: "Construction, as defined in the retrieved scope, including the examples listed there. The example list was not fully copied.",
    activity: "Work that may expose employees to lead, including demolition, removal, renovation, installation, cleanup, and related maintenance named in the scope.",
    responsibleParty: "Employer",
    deadlineOrTrigger:
      "The retrieved subsection (c) states a 10 microgram per cubic meter 8-hour TWA figure. The action-level definition that was read states 2 micrograms per cubic meter. An abrasive-blasting exception until January 1, 2030 was seen and not copied in full. Do not calculate a medical or task deadline from this summary.",
    deadlineVerified: false,
    recurrence: null,
    reviewStatus: "PENDING_QUALIFIED_REVIEW",
    limitations: DIR_LIMIT + " The PEL and action-level sentences were read. The abrasive-blasting exception, trigger tasks, and medical surveillance were not fully extracted. Older templates that use different numbers were not compared.",
    legalAuthority: "California Code of Regulations, Title 8, section 1532.1",
    triggers: [{ description: "Construction work where an employee may be occupationally exposed to lead.", statedInSource: true }],
    exceptions: [{ description: "The retrieved PEL subsection includes an abrasive-blasting exception until January 1, 2030. The full exception text was not copied.", partial: true }],
    evidence: [{ name: "Exposure assessment", description: "Expected somewhere in the standard. The controlling assessment subsections were not fully extracted, so this catalog does not state the exact record.", statedInSource: false }],
    rules: [{ description: "Potentially applicable to construction that may disturb lead-containing material. Applicability is pending until the material and task are known.", result: "PENDING_QUALIFIED_REVIEW" }],
  },
];

export function catalogProblems(): string[] {
  const problems: string[] = [];
  const sourceCodes = new Set(sources.map((source) => source.code));
  for (const requirement of requirements) {
    if (!sourceCodes.has(requirement.sourceCode)) problems.push(`${requirement.code} missing source`);
    if (!requirement.scope || !requirement.responsibleParty || !requirement.deadlineOrTrigger || !requirement.limitations) {
      problems.push(`${requirement.code} missing a core field`);
    }
    if (requirement.deadlineVerified && !requirement.officialExcerpt) {
      problems.push(`${requirement.code} verified without an excerpt`);
    }
    if (/\$[0-9]|penalty|fine of/i.test(requirement.plainLanguageEn)) {
      problems.push(`${requirement.code} may state a penalty or dollar figure that was not intended`);
    }
  }
  const fall = requirements.find((requirement) => requirement.code === "CCR-T8-1670");
  if (!fall?.limitations.toLowerCase().includes("not a universal")) {
    problems.push("1670 must say it is not a universal height");
  }
  const roof = requirements.find((requirement) => requirement.code === "CCR-T8-1730");
  if (!roof?.plainLanguageEn.includes("1731") || !roof.plainLanguageEn.includes("not the 7 1/2 foot")) {
    problems.push("1730 must keep the residential gap and distinguish section 1670");
  }
  const excavation = requirements.find((requirement) => requirement.code === "CCR-T8-1541-1");
  if (!excavation?.limitations.toLowerCase().includes("not the only rule")) {
    problems.push("1541.1 must say the depth and slope figures are not the only rule");
  }
  for (const code of ["CCR-T8-5141-1", "CCR-T8-1532-1", "CCR-T8-1730", "CCR-T8-1541-1"]) {
    if (!requirements.some((requirement) => requirement.code === code)) problems.push(`${code} missing`);
  }
  return problems;
}
