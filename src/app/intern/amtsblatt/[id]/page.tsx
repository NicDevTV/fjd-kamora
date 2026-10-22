import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function DokumentPage({ params }: PageProps<"/intern/amtsblatt/[id]">) {
  await requireUser();
  const { id } = await params;
  const document = await (await getStore()).getDocument(id);
  if (!document) notFound();
  const template = getTemplate(document.template);
  const pdf = `/intern/amtsblatt/${document.id}/pdf`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="glass-panel overflow-hidden p-3">
        <iframe src={pdf} title={`Urkunde ${document.number}`} className="h-[80vh] min-h-[32rem] w-full rounded-[1.5rem] bg-white" />
      </section>
      <aside className="glass-panel h-fit p-7">
        <p className="text-sm tabular-nums text-muted">{document.number}</p>
        <h1 className="mt-1 font-serif text-3xl font-medium leading-tight">{template?.title ?? document.template}</h1>
        <dl className="mt-5 space-y-3 text-[0.9375rem]">
          {template?.fields.map((field) => (
            <div key={field.name}>
              <dt className="text-xs text-muted">{field.label}</dt>
              <dd>{field.type === "date" ? formatDate(document.fields[field.name]) : document.fields[field.name]}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-muted">Unterzeichnet</dt>
            <dd>
              {document.signerName}, {document.signerTitle}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ausgefertigt</dt>
            <dd>{ISSUED.format(new Date(document.issuedAt))}</dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-col gap-2">
          <a href={`${pdf}?download=1`} className="liquid-solid rounded-full px-6 py-3 text-center text-sm font-medium text-white">
            PDF herunterladen
          </a>
          <Link href="/intern/amtsblatt" className="rounded-full px-6 py-3 text-center text-sm font-medium text-ink/75 hover:bg-white/70">
            Zurück zum Amtsblatt
          </Link>
        </div>
      </aside>
    </div>
  );
}
