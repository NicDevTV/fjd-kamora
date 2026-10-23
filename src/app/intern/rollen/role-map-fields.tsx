"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { syncNow } from "./actions";

export function RoleMapFields({ children }: { children: ReactNode }) {
  const { pending, action } = useFormStatus();
  const syncing = action === syncNow;
  return (
    <fieldset disabled={pending} aria-busy={pending} className="min-w-0">
      {children}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="liquid-solid inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60">
          {pending && !syncing && <Spinner />}
          {pending && !syncing ? "Speichert …" : "Zuordnung speichern"}
        </button>
        <button type="submit" formAction={syncNow} className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-sm font-medium text-ink/80 transition-colors hover:bg-white/70 disabled:cursor-wait disabled:opacity-60">
          {pending && syncing && <Spinner />}
          {pending && syncing ? "Gleicht ab …" : "Alle jetzt abgleichen"}
        </button>
      </div>
      <p role="status" className="mt-3 text-sm text-muted">
        {pending ? (syncing ? "Konten werden mit Discord abgeglichen …" : "Zuordnung wird gespeichert und Konten werden abgeglichen …") : null}
      </p>
    </fieldset>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M10 3a7 7 0 0 1 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
