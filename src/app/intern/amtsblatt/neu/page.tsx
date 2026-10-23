import { randomInt } from "node:crypto";
import Link from "next/link";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { getTemplate, templatesFor, titlesFor } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { IssueStudio } from "./issue-studio";
import { isPublicTemplate } from "@/lib/amtsblatt/publication";
import { TemplateGallery } from "./template-gallery";
import { LEADERSHIP_IDS, leadershipChoices } from "@/lib/amtsblatt/leadership";
import { LeadershipStudio } from "./leadership-studio";

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

const GROUPS = [
  { name: "Amtsleitungen", hint: "Chief of Police, Generalstaatsanwalt, Chief Marshal und Leitung der Inneren Revision. Die Ernennung erfolgt durch die jeweils zuständige Stelle." },
  { name: "Ernennung", hint: "Justizminister, Staatssekretär, Richter, Minister und Ränge im Departement." },
  { name: "Dienstrecht", hint: "Eid, Beförderung, Disziplin und Entlassung im Departement." },
  { name: "Waffen", hint: "Waffenschein, Entzug und Handelslizenz nach dem Waffengesetz." },
  { name: "Beschlüsse", hint: "Anordnungen, Gerichtsentscheidungen und Gnadenverfahren der zuständigen Stellen." },
] as const;


export default async function NeuPage({ searchParams }: PageProps<"/intern/amtsblatt/neu">) {
  const user = await requireUser();
  const params = await searchParams;
  const available = templatesFor(user.roles);
  const choices = leadershipChoices(user.roles);
  const leadership = params.vorlage === "amtsleitung" && choices.length > 0;
  const chosen = leadership ? getTemplate(choices[0].templateId) : typeof params.vorlage === "string" ? getTemplate(params.vorlage) : null;
  const template = chosen && available.includes(chosen) ? chosen : null;
  const today = new Date().toISOString().slice(0, 10);

  if (!template) {
    return (
      <div className="space-y-8">
        <header className="glass-panel p-8 sm:p-10">
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">Urkunde ausfertigen</h1>
          <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink/75">
            Wähle den Vorgang. Angaben und Unterschrift ergänzt du im nächsten Schritt.
          </p>
        </header>

        {available.length === 0 ? (
          <p className="glass-panel p-8 text-ink/75">Für deine Rolle gibt es noch keine Vorlagen.</p>
        ) : (
          <TemplateGallery groups={[...GROUPS]} entries={available
            .filter((item) => !LEADERSHIP_IDS.has(item.id) || item === available.find((candidate) => LEADERSHIP_IDS.has(candidate.id)))
            .map((item, index) => ({
              id: LEADERSHIP_IDS.has(item.id) ? "amtsleitung" : item.id,
              title: LEADERSHIP_IDS.has(item.id) ? "Amtsleitung ernennen" : item.label,
              description: LEADERSHIP_IDS.has(item.id) ? choices.map((choice) => choice.office).join(" · ") : item.description,
              group: item.group,
              authority: LEADERSHIP_IDS.has(item.id) ? "Je nach Amt: Justizminister oder Gouverneur" : titlesFor(item, user.roles)[0],
              public: isPublicTemplate(item.id),
              preview: <CertificatePreview data={{ template: item, fields: item.sample, number: "AB-0000-0000", signerName: user.serviceName ?? "Konrad von Ellwangen", signerSignature: user.signature, signerHonorific: user.honorific, signerTitle: titlesFor(item, user.roles)[0], signerKey: user.id, seed: 1000 + index * 7919, issuedAt: today }} />,
            }))} />
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
          <h1 className="mt-2 font-serif text-4xl font-medium leading-tight">{leadership ? "Amtsleitung ernennen" : template.label}</h1>
          <p className="mt-2 max-w-prose text-ink/70">{leadership ? "Wähle die Amtsleitung und fülle die Ernennungsurkunde aus." : template.description}</p>
        </div>
      </header>

      {!user.serviceName || !user.signature ? (
        <p className="glass-panel p-8 text-ink/75">
          Lege zuerst im{" "}
          <Link href="/intern/profil" className="rk-ref">
            Profil
          </Link>{" "}
          deinen Dienstnamen und deine gezeichnete Unterschrift fest. Danach kannst du die Urkunde ausfertigen.
        </p>
      ) : leadership ? (
        <LeadershipStudio choices={choices} signerName={user.serviceName} signerSignature={user.signature} signerHonorific={user.honorific} signerKey={user.id} today={today} previewSeed={randomInt(1, 2 ** 31 - 1)} />
      ) : (
        <IssueStudio
          key={template.id}
          templateId={template.id}
          signerName={user.serviceName}
          signerSignature={user.signature}
          signerHonorific={user.honorific}
          signerKey={user.id}
          titles={titlesFor(template, user.roles)}
          today={today}
          previewSeed={randomInt(1, 2 ** 31 - 1)}
        />
      )}
    </div>
  );
}
