import type { ReactNode } from "react";
import { withAbbreviations } from "@/components/abbr";

// Diagrams inside the codex. The Markdown places them with a line such as
// "::schaubild staatsaufbau::" (see the p renderer on the codex page).
// Every box links to the norm it summarises; refs maps keys like "KV 12" to anchors.

type Refs = Map<string, string>;

function Node({
  title,
  children,
  norm,
  refs,
  tone = "light",
}: {
  title: string;
  children: ReactNode;
  norm: string;
  refs: Refs;
  tone?: "light" | "dark";
}) {
  const href = refs.get(norm);
  const dark = tone === "dark";
  return (
    <a
      href={href}
      className={`sb-node group block rounded-[1.25rem] px-5 py-4 ${dark ? "sb-node-dark text-white" : "glass-inset text-ink"}`}
    >
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-serif text-lg font-medium leading-snug">{withAbbreviations(title)}</span>
        <span className={`shrink-0 text-xs tabular-nums ${dark ? "text-white/60" : "text-muted"}`}>
          {withAbbreviations(norm)}
        </span>
      </span>
      <span className={`mt-1 block text-sm leading-relaxed ${dark ? "text-white/75" : "text-ink/75"}`}>
        {children}
      </span>
    </a>
  );
}

// A vertical connector with the relation written next to it ("wählt", "ernennt").
function Edge({ children }: { children: ReactNode }) {
  return (
    <div className="sb-edge flex items-center gap-3 py-1.5 pl-7 text-sm text-muted">
      <span aria-hidden="true" className="sb-edge-line" />
      <span>{children}</span>
    </div>
  );
}

function Staatsaufbau({ refs }: { refs: Refs }) {
  return (
    <figure className="mt-6">
      <Node title="Höhere Ordnung" norm="KV 12" refs={refs} tone="dark">
        Sicherheitsrat mit der Charta über allem. Ernennt und entlässt den Justizminister, gibt Hinrichtung,
        Haft über 180 HE und Enteignung frei.
      </Node>

      <div className="mt-2 grid gap-x-6 gap-y-8 md:grid-cols-2">
        <section aria-label="Politik" className="sb-group sb-group-politik">
          <p className="mb-3 mt-4 text-sm font-medium text-ink">Politik: gewählt</p>
          <Node title="Volk" norm="KV 15" refs={refs}>
            Jeder Bürger mit Ausweis hat eine Stimme.
          </Node>
          <Edge>wählt alle 180 Tage</Edge>
          <Node title="Senat" norm="KV 6" refs={refs}>
            7 Sitze über Parteilisten. Beschließt Gesetze und kontrolliert den JM im Justizausschuss.
          </Node>
          <Edge>wählt binnen 7 Tagen</Edge>
          <Node title="Gouverneur" norm="KV 5" refs={refs}>
            Staatsoberhaupt. Ernennt Minister, Richter und GStA, ruft den Notstand aus, entscheidet über Gnade.
          </Node>
          <Edge>ernennt den Chief</Edge>
          <Node title="KPD" norm="PolG 1" refs={refs}>
            Die einzige Behörde mit Polizeibefugnissen.
          </Node>
        </section>

        <section aria-label="Justiz" className="sb-group sb-group-justiz">
          <p className="mb-3 mt-4 text-sm font-medium text-ink">Justiz: ernannt und unabhängig</p>
          <Edge>von der höheren Ordnung ernannt</Edge>
          <Node title="Justizminister" norm="KV 7" refs={refs}>
            Parteilos. Leitet das FJD und die Wahlen, gibt dem KPD Weisungen, erlässt Verordnungen.
          </Node>
          <Edge>leitet</Edge>
          <Node title="FJD" norm="FJDS 2" refs={refs}>
            Staatsanwaltschaft, Justizmarschalldienst und Innere Revision.
          </Node>
          <Edge>Anklage vor</Edge>
          <Node title="Gerichte und OGH" norm="JO 1" refs={refs}>
            Weisungsfrei. Der OGH prüft Gesetze, Verordnungen, Wahlen, Parteiverbote und Amtsenthebungen.
          </Node>
        </section>
      </div>

      <figcaption className="mt-6 max-w-prose text-sm leading-relaxed text-muted">
        Die gewählte Politik und die ernannte Justiz sind getrennt, damit eine Wahlmehrheit nie die
        Strafverfolgung übernehmen kann. Jeder Kasten führt zur Norm.
      </figcaption>
    </figure>
  );
}

const CYCLE = [
  { when: "Tag −14", what: "Der JM als Wahlleiter verkündet den Wahltag im Amtsblatt.", norm: "KV 15" },
  { when: "Tag −7", what: "Parteilisten sind eingereicht, Kandidaten und ihre Akten der letzten 90 Tage geprüft.", norm: "KV 15" },
  { when: "Wahltag", what: "Geheime Wahl, öffentliche Auszählung, 7 Sitze nach Stimmenanteil.", norm: "KV 15" },
  { when: "+48 h", what: "Einspruch gegen das Ergebnis beim OGH, der binnen 72 h entscheidet.", norm: "JO 1" },
  { when: "+7 Tage", what: "Der Senat wählt seinen Präsidenten, dann den Gouverneur.", norm: "KV 5" },
  { when: "Tag 180", what: "Nächste Wahl. Im Notstand höchstens 48 h später.", norm: "KV 11" },
];

function Wahlzyklus({ refs }: { refs: Refs }) {
  return (
    <figure className="mt-6">
      <ol className="sb-cycle grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CYCLE.map((step) => (
          <li key={step.when}>
            <a href={refs.get(step.norm)} className="sb-node glass-inset block h-full rounded-[1.25rem] px-5 py-4">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-xl font-medium tabular-nums text-accent">{step.when}</span>
                <span className="text-xs tabular-nums text-muted">{withAbbreviations(step.norm)}</span>
              </span>
              <span className="mt-1.5 block text-sm leading-relaxed text-ink/80">{withAbbreviations(step.what)}</span>
            </a>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 text-sm text-muted">Ein Wahlzyklus dauert 180 Tage.</figcaption>
    </figure>
  );
}

export const SCHAUBILD_PATTERN = /^::schaubild ([a-z]+)::$/;

export function Schaubild({ name, refs }: { name: string; refs: Refs }) {
  if (name === "staatsaufbau") return <Staatsaufbau refs={refs} />;
  if (name === "wahlzyklus") return <Wahlzyklus refs={refs} />;
  return null;
}
