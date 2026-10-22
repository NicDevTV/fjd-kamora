import { ViewTransition } from "react";
import { GlassBackdrop } from "@/components/glass-backdrop";
import { Hero } from "@/components/hero/hero";
import { AemterCards } from "@/components/home/aemter-cards";
import { Rangfolge } from "@/components/home/rangfolge";
import { Verfahrensweg } from "@/components/home/verfahrensweg";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  aemter,
  getCases,
  getNotices,
  rangfolge,
  verfahrensweg,
  type CaseStatus,
} from "@/lib/fjd-data";
import { pageTransition } from "@/lib/view-transitions";

const statusLabel: Record<CaseStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  vertagt: "Vertagt",
  abgeschlossen: "Abgeschlossen",
};

function SectionHeading({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h2
        id={id}
        data-reveal
        className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] font-medium leading-[1.05] tracking-tight"
      >
        {title}
      </h2>
      {children && (
        <p data-reveal className="mt-5 text-[1.0625rem] leading-relaxed text-ink/75">
          {children}
        </p>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [cases, notices] = await Promise.all([getCases(), getNotices()]);

  return (
    <>
      <ScrollReveal />
      <SiteHeader />

      <ViewTransition enter={pageTransition.enter} exit={pageTransition.exit} default="none">
        <main id="inhalt" className="relative flex-1">
          <Hero />

          {/* The glass sheet slides over the pinned hero while scrolling. */}
          <div className="relative isolate z-10 -mt-10 overflow-clip rounded-t-[2.5rem] bg-paper shadow-[0_-40px_80px_-30px_rgb(5_10_20/0.6)]">
            <GlassBackdrop />

            <Verfahrensweg steps={verfahrensweg} />

            <section
              id="aemter"
              aria-labelledby="aemter-titel"
              className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32"
            >
              <SectionHeading id="aemter-titel" title="Drei Ämter, ein Departement.">
                Das FJD wird vom Justizminister geleitet. Unter ihm arbeiten Anklage, Schutz und
                Kontrolle getrennt voneinander.
              </SectionHeading>
              <div className="mt-14">
                <AemterCards aemter={aemter} />
              </div>
            </section>

            <section
              id="rangfolge"
              aria-labelledby="rangfolge-titel"
              className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32"
            >
              <SectionHeading id="rangfolge-titel" title="Was über allem steht.">
                Jede Regel in Kamora gilt nur im Rahmen der Ebene darüber. Ganz oben steht die
                Charta der Föderation, darunter die Verfassung.
              </SectionHeading>
              <div className="mt-12">
                <Rangfolge levels={rangfolge} />
              </div>
            </section>

            <section
              id="aktuelles"
              aria-labelledby="aktuelles-titel"
              className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32"
            >
              <SectionHeading id="aktuelles-titel" title="Aktuelles" />

              <div className="mt-12 grid gap-5 lg:grid-cols-2">
                <div data-reveal className="glass-panel p-7 sm:p-8">
                  <h3 className="font-serif text-2xl font-medium">Verfahren</h3>
                  {cases.length === 0 ? (
                    <div className="mt-5 rounded-[1.25rem] border border-dashed border-ink/15 p-5">
                      <p className="font-medium">Noch keine Verfahren erfasst.</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink/65">
                        Sobald ein Verfahren angelegt ist, erscheint es hier mit Aktenzeichen und Stand.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-6 divide-y divide-ink/10">
                      {cases.map((item) => (
                        <li key={item.id} className="py-4">
                          <p className="text-xs tabular-nums text-muted">{item.id}</p>
                          <p className="mt-1 font-medium">{item.title}</p>
                          <p className="mt-1 text-sm text-muted">
                            {item.department}, {statusLabel[item.status]}, Stand {item.updatedAt}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div data-reveal className="glass-panel p-7 sm:p-8" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                  <h3 className="font-serif text-2xl font-medium">Mitteilungen</h3>
                  {notices.length === 0 ? (
                    <div className="mt-5 rounded-[1.25rem] border border-dashed border-ink/15 p-5">
                      <p className="font-medium">Keine Mitteilungen.</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink/65">
                        Verordnungen und Begnadigungen erscheinen im Amtsblatt und werden hier
                        angekündigt.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-6 divide-y divide-ink/10">
                      {notices.map((notice) => (
                        <li key={notice.id} className="py-4">
                          <p className="text-xs tabular-nums text-muted">{notice.date}</p>
                          <p className="mt-1 font-serif text-lg font-medium">{notice.title}</p>
                          <p className="mt-1 text-sm text-muted">{notice.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <SiteFooter />
          </div>
        </main>
      </ViewTransition>
    </>
  );
}
