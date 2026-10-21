"use client";

import { createContext, useContext, useEffect, useState, type MouseEvent, type ReactNode } from "react";

type OffenseState = { open: boolean; toggle: () => void; detailId: string };

const OffenseContext = createContext<OffenseState | null>(null);

// A row of the penalty catalogue that unfolds its definition underneath.
// The whole row is clickable; the button in the first cell carries keyboard and screen reader use.
export function OffenseRow({
  id,
  columns,
  definition,
  children,
}: {
  id: string;
  columns: number;
  definition: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detailId = `${id}-definition`;

  // A jump to this row from search or a reference unfolds the definition as well.
  useEffect(() => {
    const sync = () => {
      if (decodeURIComponent(window.location.hash) === `#${id}`) setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("rk:target", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("rk:target", sync);
    };
  }, [id]);

  function onRowClick(event: MouseEvent<HTMLTableRowElement>) {
    // Links and the toggle button handle their own clicks.
    if ((event.target as HTMLElement).closest("a, button")) return;
    // Selecting text should not fold the row.
    if (window.getSelection()?.toString()) return;
    setOpen((value) => !value);
  }

  return (
    <OffenseContext value={{ open, toggle: () => setOpen((value) => !value), detailId }}>
      <tr id={id} data-open={open} onClick={onRowClick} className="rk-offense scroll-mt-32 cursor-pointer">
        {children}
      </tr>
      <tr className="rk-offense-detail" data-open={open}>
        <td colSpan={columns} className="p-0">
          <div id={detailId} inert={!open} className="rk-offense-fold">
            {/* clip, not hidden: hidden would become the scroll box and break the sticky text below */}
            <div className="min-h-0 overflow-clip">
              <div className="rk-offense-text px-4 pb-4 pt-1 sm:pl-[3.25rem]">
                <p className="max-w-prose border-l-2 border-accent/60 pl-4 text-[0.9375rem] leading-relaxed text-ink/85">
                  {definition}
                </p>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </OffenseContext>
  );
}

export function OffenseToggle({ children }: { children: ReactNode }) {
  const state = useContext(OffenseContext);
  if (!state) return children;
  return (
    <button
      type="button"
      onClick={state.toggle}
      aria-expanded={state.open}
      aria-controls={state.detailId}
      className="rk-offense-toggle inline-flex items-center gap-2 tabular-nums"
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 text-accent">
        <path d="M4 2.5L7.5 6L4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
      <span className="sr-only">Definition anzeigen</span>
    </button>
  );
}
