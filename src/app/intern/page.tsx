import Link from "next/link";
import { getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function InternPage({ searchParams }: PageProps<"/intern">) {
  const user = await requireUser();
  const params = await searchParams;
  const documents = await (await getStore()).listDocuments(5);

  return (
    <div className="space-y-8">
      <section className="glass-panel p-8 sm:p-10">
        <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">
          Willkommen, {user.serviceName ?? user.discordName}.
        </h1>
        {params.fehler === "keine-berechtigung" && (
          <p role="alert" className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            Für diesen Bereich fehlt dir die Rolle.
          </p>
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
                    {getTemplate(document.template)?.title ?? document.template}: {document.fields.name}
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
