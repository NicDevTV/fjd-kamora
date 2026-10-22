import Link from "next/link";
import { TEMPLATES, getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { IssueForm } from "../../forms";

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function NeuPage({ searchParams }: PageProps<"/intern/amtsblatt/neu">) {
  const user = await requireUser("justizminister");
  const params = await searchParams;
  const template = typeof params.vorlage === "string" ? getTemplate(params.vorlage) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <nav aria-label="Vorlagen" className="glass-panel h-fit p-5">
        <p className="px-3 pb-2 text-sm font-medium">Vorlage</p>
        <ul className="space-y-1">
          {TEMPLATES.map((item) => (
            <li key={item.id}>
              <Link
                href={`/intern/amtsblatt/neu?vorlage=${item.id}`}
                aria-current={item.id === template?.id ? "page" : undefined}
                className={`block rounded-2xl px-3 py-3 text-[0.9375rem] transition-colors ${
                  item.id === template?.id ? "bg-navy text-white" : "hover:bg-white/70"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="glass-panel p-8 sm:p-10">
        {!template ? (
          <>
            <h1 className="font-serif text-4xl font-medium">Urkunde ausfertigen</h1>
            <p className="mt-4 max-w-prose text-ink/75">Wähle links eine Vorlage. Das Formular fragt nur ab, was auf der Urkunde steht.</p>
          </>
        ) : !user.serviceName ? (
          <>
            <h1 className="font-serif text-4xl font-medium">{template.label}</h1>
            <p className="mt-4 max-w-prose text-ink/75">
              Lege zuerst im <Link href="/intern/profil" className="rk-ref">Profil</Link> deinen Dienstnamen fest. Mit ihm wird
              die Urkunde unterschrieben.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-4xl font-medium">{template.label}</h1>
            <p className="mt-3 max-w-prose text-ink/75">{template.description}</p>
            <IssueForm
              key={template.id}
              template={template.id}
              fields={template.fields}
              defaultSignerTitle={template.defaultSignerTitle}
              signerName={user.serviceName}
            />
          </>
        )}
      </section>
    </div>
  );
}
