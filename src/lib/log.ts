const SECRET_KEY = /password|secret|token|authorization|dsn|cookie/i;

function redactEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return "[redacted]";
  return `${name.slice(0, 1)}***@${domain}`;
}

export function redactLogFields(fields: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEY.test(key)) continue;
    if (key.toLowerCase() === "email" && typeof value === "string") {
      safe.email = redactEmail(value);
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
  }
  return safe;
}

export function logServerEvent(event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...redactLogFields(fields),
  });
  console.error(line);
}
