import { fullName } from "@/lib/server/db/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { formatDate, getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";
import { DownloadLink } from "../../download-link";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function DokumentPage({ params }: PageProps<"/intern/amtsblatt/[id]">) {
  await requireUser();
  const { id } = await params;
  const document = await (await getStore()).getDocument(id);
  if (!document) notFound();
  const template = getTemplate(document.template);
  if (!template) notFound();
  const pdf = `/intern/amtsblatt/${document.id}/pdf`;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* The certificate in HTML, drawn from the same seed as the PDF: sharp at every size. */}
      <section aria-label="Urkunde" className="rounded-[2rem] bg-[#d9c9a5]/60 p-4 shadow-[inset_0_2px_12px_rgb(60_40_15/0.18)] sm:p-8">
        <div className="mx-auto max-w-[40rem]">
          <CertificatePreview
            data={{
              template,
              fields: document.fields,
              number: document.number,
              signerName: document.signerName,
              signerHonorific: document.signerHonorific,
              signerTitle: document.signerTitle,
              signerKey: document.issuedBy,
              seed: document.signatureSeed,
              issuedAt: document.issuedAt,
            }}
          />
        </div>
      </section>

      <aside className="glass-panel p-7 lg:sticky lg:top-6">
        <p className="text-sm tabular-nums text-muted">{document.number}</p>
        <h1 className="mt-1 font-serif text-[1.75rem] font-medium leading-tight">{template.title}</h1>
        <dl className="mt-5 space-y-3 text-[0.9375rem]">
          {template.fields.map((field) => (
            <div key={field.name}>
              <dt className="text-xs text-muted">{field.label}</dt>
              <dd>{field.type === "date" ? formatDate(document.fields[field.name]) : document.fields[field.name]}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-muted">Unterzeichnet</dt>
            <dd>{fullName(document.signerHonorific, document.signerName)}</dd>
            <dd className="text-sm text-muted">{document.signerTitle}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ausgefertigt</dt>
            <dd>{ISSUED.format(new Date(document.issuedAt))}</dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-col gap-2">
          <DownloadLink href={`${pdf}?download=1`} number={document.number} />
          <a
            href={pdf}
            target="_blank"
            rel="noopener"
            className="rounded-full border border-ink/15 px-6 py-3 text-center text-sm font-medium text-ink/80 transition-colors hover:bg-white/70"
          >
            PDF in neuem Tab öffnen
          </a>
          <Link href="/intern/amtsblatt" className="rounded-full px-6 py-3 text-center text-sm font-medium text-ink/70 hover:bg-white/70">
            Zurück zum Amtsblatt
          </Link>
        </div>
      </aside>
    </div>
  );
}
