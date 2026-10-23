"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type Entry = { id: string; title: string; description: string; group: string; authority: string; public: boolean; preview: ReactNode };
const fold = (value: string) => value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/ß/g, "ss");

export function TemplateGallery({ entries, groups }: { entries: Entry[]; groups: { name: string; hint: string }[] }) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [visibility, setVisibility] = useState("");
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const matches = entries.filter((entry) => (!group || entry.group === group) && (!visibility || entry.public === (visibility === "public")) && terms.every((term) => fold([entry.title, entry.description, entry.group, entry.authority].join(" ")).includes(term)));
  const available = groups.filter((item) => entries.some((entry) => entry.group === item.name));
  const reset = () => { setQuery(""); setGroup(""); setVisibility(""); };
  const filterStyle = "min-h-11 rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return <div className="space-y-8">
    <div className="glass-panel space-y-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <label className="block text-xs font-medium text-muted">Vorlage suchen
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Amt oder Vorgang …" className="mt-2 block min-h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20" />
        </label>
        <label className="block text-xs font-medium text-muted">Veröffentlichung
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/20">
            <option value="">Alle Vorlagen</option><option value="public">Öffentlich</option><option value="internal">Nur intern</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Bereich wählen">
        {[{ name: "", label: "Alle", count: entries.length }, ...available.map((item) => ({ name: item.name, label: item.name, count: entries.filter((entry) => entry.group === item.name).length }))].map((item) => <button key={item.name} type="button" aria-pressed={group === item.name} onClick={() => setGroup(item.name)} className={`${filterStyle} ${group === item.name ? "bg-navy text-white shadow-sm" : "bg-white/60 text-navy hover:bg-white"}`}>{item.label}<span className="ml-2 opacity-55">{item.count}</span></button>)}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p role="status">{matches.length} {matches.length === 1 ? "Vorlage" : "Vorlagen"}{query && <> für „{query}“</>}</p>
      {(query || group || visibility) && <button type="button" onClick={reset} className="min-h-10 rounded-lg px-2 text-navy underline underline-offset-4">Filter zurücksetzen</button>}
    </div>
    {available.map((section) => {
      const items = matches.filter((entry) => entry.group === section.name);
      if (!items.length) return null;
      return <section key={section.name} aria-labelledby={`gruppe-${section.name}`}>
        <div className="mb-4"><h2 id={`gruppe-${section.name}`} className="font-serif text-2xl font-medium">{section.name}</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{section.hint}</p></div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((entry, index) => <motion.li key={entry.id} className="min-w-0"
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : (index % 3) * 0.09, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <Link href={`/intern/amtsblatt/neu?vorlage=${entry.id}`} className="tpl-card glass-panel group flex h-full min-w-0 flex-col p-5 hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:p-6">
              <div className="tpl-thumb mb-5 flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-[#e6d8b6] p-4 sm:h-72">
                <div className="w-40 shrink-0 sm:w-44">{entry.preview}</div>
              </div>
              <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.public ? "bg-[#2f6f4f]/10 text-[#245a40]" : "bg-navy/7 text-navy"}`}>{entry.public ? "Öffentlich" : "Nur intern"}</span><span aria-hidden="true" className="text-navy/40 transition-transform group-hover:translate-x-1">→</span></div>
              <h3 className="mt-4 font-serif text-xl font-medium leading-snug text-ink hyphens-auto [overflow-wrap:anywhere]">{entry.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{entry.description}</p>
              <p className="mt-5 border-t border-ink/8 pt-3 text-xs text-navy/65">{entry.authority}</p>
            </Link>
          </motion.li>)}
        </ul>
      </section>;
    })}
    {!matches.length && <div className="glass-panel p-8 text-center"><h2 className="font-serif text-2xl">Keine passende Vorlage</h2><p className="mt-2 text-sm text-muted">Versuche einen anderen Suchbegriff oder setze die Filter zurück.</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full bg-navy px-5 py-2 text-sm text-white">Alle Vorlagen anzeigen</button></div>}
  </div>;
}
