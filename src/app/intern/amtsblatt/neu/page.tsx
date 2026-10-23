import { randomInt } from "node:crypto";
import Link from "next/link";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { getTemplate, templatesFor } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { IssueStudio } from "./issue-studio";

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

const ISSUER_LABEL = { foederation: "Sicherheitsrat", fjd: "Justizdepartement" } as const;

export default async function NeuPage({ searchParams }: PageProps<"/intern/amtsblatt/neu">) {
  const user = await requireUser();
  const params = await searchParams;
  const available = templatesFor(user.roles);
  const chosen = typeof params.vorlage === "string" ? getTemplate(params.vorlage) : null;
  const template = chosen && available.includes(chosen) ? chosen : null;
  const today = new Date().toISOString().slice(0, 10);

  if (!template) {
    return (
      <div className="space-y-8">
        <header className="glass-panel p-8 sm:p-10">
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">Urkunde ausfertigen</h1>
          <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink/75">
            Wähle eine Vorlage. Danach siehst du die Urkunde beim Ausfüllen genau so, wie sie ins Amtsblatt geht.
          </p>
        </header>

        {available.length === 0 ? (
          <p className="glass-panel p-8 text-ink/75">Für deine Rolle gibt es noch keine Vorlagen.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {available.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={`/intern/amtsblatt/neu?vorlage=${item.id}`}
                  className="tpl-card glass-panel group flex h-full flex-col p-4"
                >
                  <div className="tpl-thumb relative overflow-hidden rounded-[1.25rem] bg-[#e6d8b6] p-5">
                    <CertificatePreview
                      data={{
                        template: item,
                        fields: item.sample,
                        number: "AB-0000-0000",
                        signerName: user.serviceName ?? "Konrad von Ellwangen",
                        signerTitle: item.signerTitles[0],
                        seed: 1000 + index * 7919,
                        issuedAt: today,
                      }}
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-2 pb-2 pt-5">
                    <span className="w-fit rounded-full bg-navy/8 px-3 py-1 text-xs font-medium text-navy">
                      {ISSUER_LABEL[item.seal]}
                    </span>
                    <span className="mt-3 font-serif text-xl font-medium leading-snug">{item.label}</span>
                    <span className="mt-2 text-sm leading-relaxed text-ink/70">{item.description}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/intern/amtsblatt/neu" className="text-sm text-muted transition-colors hover:text-ink">
            ← Alle Vorlagen
          </Link>
          <h1 className="mt-2 font-serif text-4xl font-medium leading-tight">{template.label}</h1>
          <p className="mt-2 max-w-prose text-ink/70">{template.description}</p>
        </div>
      </header>

      {!user.serviceName ? (
        <p className="glass-panel p-8 text-ink/75">
          Lege zuerst im{" "}
          <Link href="/intern/profil" className="rk-ref">
            Profil
          </Link>{" "}
          deinen Dienstnamen fest. Mit ihm wird die Urkunde unterschrieben.
        </p>
      ) : (
        <IssueStudio
          key={template.id}
          templateId={template.id}
          signerName={user.serviceName}
          today={today}
          previewSeed={randomInt(1, 2 ** 31 - 1)}
        />
      )}
    </div>
  );
}
