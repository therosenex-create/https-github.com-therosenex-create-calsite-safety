import type { ReactNode } from "react";
import { t, type Locale } from "@/lib/i18n";

export function EnumOptions({ locale, group, values }: { locale: Locale; group: string; values: readonly string[] }) {
  return values.map((value) => (
    <option key={value} value={value}>
      {t(locale, `enum.${group}.${value}`)}
    </option>
  ));
}

export function TextField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  hint,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
  hint?: string;
  autoComplete?: string;
}) {
  const id = `field-${name}`;
  return (
    <label className="block" htmlFor={id}>
      <span className="label">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        id={id}
        className="input"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        autoComplete={autoComplete}
      />
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  required,
  defaultValue,
  hint,
  rows = 4,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | null;
  hint?: string;
  rows?: number;
}) {
  const id = `field-${name}`;
  return (
    <label className="block" htmlFor={id}>
      <span className="label">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea id={id} className="input" name={name} required={required} rows={rows} defaultValue={defaultValue ?? ""} />
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  hint,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  const id = `field-${name}`;
  return (
    <label className="block" htmlFor={id}>
      <span className="label">{label}</span>
      <select id={id} className="input" name={name} defaultValue={defaultValue ?? undefined}>
        {children}
      </select>
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-serif text-3xl text-navy">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Pager({
  page,
  total,
  pageSize,
  hrefFor,
  previous,
  next,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
  previous: string;
  next: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm">
      <a className={page > 1 ? "btn-secondary" : "pointer-events-none opacity-40 btn-secondary"} href={hrefFor(Math.max(1, page - 1))}>
        {previous}
      </a>
      <span>
        {page} / {pages}
      </span>
      <a className={page < pages ? "btn-secondary" : "pointer-events-none opacity-40 btn-secondary"} href={hrefFor(page + 1)}>
        {next}
      </a>
    </nav>
  );
}
