import Link from "next/link";
import { ToastOnLoad } from "@/components/toast-on-load";
import { countersignItems, openRequestFor } from "@/lib/amtsblatt/countersign";
import { subjectOf } from "@/lib/amtsblatt/template-kit";
import { getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function InternPage({ searchParams }: PageProps<"/intern">) {
  const user = await requireUser();
  const params = await searchParams;
  const store = await getStore();
  const recent = await store.listDocuments(100);
  const documents = recent.slice(0, 5);
  // Documents that wait for a countersignature of one of the user's offices (never their own).
  const stamps = await store.listStamps(recent.map((document) => document.id));
  const waiting = recent.filter((document) => {
    const template = getTemplate(document.template);
    if (!template || document.issuedBy === user.id) return false;
    const items = countersignItems(template, document.fields, stamps.filter((stamp) => stamp.documentId === document.id));
    return openRequestFor(items, user.roles) !== null;
  });

  return (
    <div className="space-y-8">
      <section className="glass-panel p-8 sm:p-10">
        <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">
          Willkommen, {user.serviceName ?? user.discordName}.
        </h1>
        {params.fehler === "keine-berechtigung" && (
          <ToastOnLoad tone="error" param="fehler" title="Kein Zugriff" description="Für diesen Bereich fehlt dir die Rolle." />
        )}
        {!user.serviceName && (
          <p className="mt-5 max-w-prose rounded-2xl bg-white/70 px-4 py-3 text-[0.9375rem] leading-relaxed">
            Lege zuerst deinen <Link href="/intern/profil" className="rk-ref">Dienstnamen</Link> fest. Mit ihm unterschreibst du
            jede Urkunde.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/intern/amtsblatt/neu" className="liquid-solid rounded-full px-6 py-3.5 text-sm font-medium text-white">
            Urkunde ausfertigen
          </Link>
          <Link href="/intern/amtsblatt" className="rounded-full px-6 py-3.5 text-sm font-medium text-ink/75 transition-colors hover:bg-white/70">
            Amtsblatt ansehen
          </Link>
        </div>
      </section>

      {waiting.length > 0 && (
        <section className="glass-panel p-8 sm:p-10">
          <h2 className="font-serif text-2xl font-medium">Wartet auf deine Gegenzeichnung</h2>
          <ul className="mt-5 divide-y divide-ink/10">
            {waiting.map((document) => (
              <li key={document.id}>
                <Link href={`/intern/amtsblatt/${document.id}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 hover:text-accent">
                  <span className="font-medium">
                    {getTemplate(document.template)?.title}: {subjectOf(document.fields)}
                  </span>
                  <span className="text-sm tabular-nums text-muted">{document.number}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass-panel p-8 sm:p-10">
        <h2 className="font-serif text-2xl font-medium">Zuletzt ausgefertigt</h2>
        {documents.length === 0 ? (
          <p className="mt-4 text-ink/70">Noch keine Urkunde. Die erste ist in einer Minute fertig.</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink/10">
            {documents.map((document) => (
              <li key={document.id}>
                <Link href={`/intern/amtsblatt/${document.id}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 hover:text-accent">
                  <span className="font-medium">
                    {getTemplate(document.template)?.title ?? document.template}: {subjectOf(document.fields)}
                  </span>
                  <span className="text-sm tabular-nums text-muted">
                    {document.number} · {ISSUED.format(new Date(document.issuedAt))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
