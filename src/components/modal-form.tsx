export function ModalForm({
  id,
  label,
  title,
  closeLabel,
  children,
}: {
  id: string;
  label: string;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <>
      <button className="btn-amber" type="button" popoverTarget={id}>
        {label}
      </button>
      <div id={id} popover="auto" className="modal" role="dialog" aria-labelledby={titleId}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="font-serif text-2xl text-navy">
            {title}
          </h2>
          <button className="btn-secondary" type="button" popoverTarget={id} popoverTargetAction="hide">
            {closeLabel}
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
