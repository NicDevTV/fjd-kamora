"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { PublicationBadge } from "@/components/publication-badge";
import { STATUS_LABEL } from "@/lib/amtsblatt/countersign";
import { filterDocuments, type DocumentEntry } from "@/lib/amtsblatt/document-search";

const control = "mt-2 min-w-0 w-full rounded-2xl border border-ink/15 bg-white/75 px-4 py-3 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/25";
const EMPTY_FILTERS = { query: "", group: "", visibility: "", status: "" };

export function DocumentIndex({ entries }: { entries: DocumentEntry[] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const query = useDeferredValue(filters.query);
  const id = useId();
  const groups = [...new Set(entries.map((entry) => entry.group))];
  const filtered = filterDocuments(entries, { ...filters, query });
  const active = Object.values(filters).some(Boolean);
  return (
    <div className="mt-7">
      <div className="glass-inset rounded-3xl p-4 sm:p-5">
        <label htmlFor={`${id}-search`} className="text-sm font-medium">Dokumente durchsuchen</label>
        <input id={`${id}-search`} type="search" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Name, Dokumentart, Nummer oder Unterzeichner …" className={control} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="min-w-0 text-xs font-medium text-ink/70">Bereich
            <select className={control} value={filters.group} onChange={(event) => setFilters({ ...filters, group: event.target.value })}>
              <option value="">Alle Bereiche</option>
              {groups.map((group) => <option key={group}>{group}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-ink/70">Veröffentlichung
            <select className={control} value={filters.visibility} onChange={(event) => setFilters({ ...filters, visibility: event.target.value })}>
              <option value="">Alle Dokumente</option>
              <option value="public">Öffentliche Bekanntmachungen</option>
              <option value="internal">Vertraulich · nur intern</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-ink/70">Bearbeitungsstand
            <select className={control} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Alle Stände</option>
              <option value="pending">Wartet auf Gegenzeichnung</option>
              <option value="valid">Gültig</option>
              <option value="void">Aufgehoben</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex min-h-8 flex-wrap items-center justify-between gap-3">
        <p role="status" aria-atomic="true" className="text-sm text-muted">{filtered.length} von {entries.length} Dokumenten</p>
        {active && <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="rounded-full border border-ink/15 px-4 py-2 text-sm transition-colors hover:bg-white/70">Filter zurücksetzen</button>}
      </div>
      {entries.length >= 1000 && <p className="mt-2 text-xs text-muted">Durchsucht werden die neuesten 1.000 Dokumente.</p>}

      {filtered.length === 0 ? (
        <p className="glass-inset mt-5 rounded-2xl p-6 text-ink/70">{entries.length ? "Keine passenden Dokumente. Ändere die Suche oder setze die Filter zurück." : "Noch keine Urkunden. Fertige die erste aus."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <Link href={`/intern/amtsblatt/${entry.id}`} className="glass-inset group flex min-w-0 flex-col gap-4 rounded-3xl p-5 transition-colors hover:bg-white/75 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-navy/8 px-3 py-1 text-xs font-medium text-navy">{entry.group}</span>
                    <PublicationBadge templateId={entry.templateId} />
                  </div>
                  <h2 className="mt-3 font-serif text-xl font-medium leading-snug hyphens-auto [overflow-wrap:anywhere] group-hover:text-accent">{entry.title}</h2>
                  <p className="mt-1 font-medium [overflow-wrap:anywhere]">{entry.subject}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">{entry.number} · {entry.issued}<br />Unterzeichnet von {entry.signer}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:max-w-52 sm:items-end sm:text-right">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${entry.status === "valid" ? "bg-[#2f6f4f]/12 text-[#245a40]" : entry.status === "void" ? "bg-accent/12 text-accent" : "bg-[#b08a2e]/15 text-[#7a5f14]"}`}>{STATUS_LABEL[entry.status]}</span>
                  {entry.progress && <span className="text-xs leading-relaxed text-muted">{entry.progress}</span>}
                  <span aria-hidden="true" className="mt-1 text-sm text-navy/65 group-hover:text-accent">Dokument öffnen →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
