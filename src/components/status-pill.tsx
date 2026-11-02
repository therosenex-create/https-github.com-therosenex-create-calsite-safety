export function StatusPill({ tone, children }: { tone: "ok" | "due" | "neutral"; children: React.ReactNode }) {
  const toneClass =
    tone === "ok"
      ? "border-pine/30 bg-[#e7f5ef] text-pine"
      : tone === "due"
        ? "border-amber/40 bg-[#f8f1de] text-amber"
        : "border-line bg-sand text-navy";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}
