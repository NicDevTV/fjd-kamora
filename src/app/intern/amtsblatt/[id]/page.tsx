import { fullName } from "@/lib/server/db/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { certificateStamps, countersignItems, openRequestFor, STATUS_LABEL, stampStatus } from "@/lib/amtsblatt/countersign";
import { formatDate, getTemplate } from "@/lib/amtsblatt/templates";
import { devLoginEnabled } from "@/lib/server/auth/config";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";
import { stampDocument } from "../../actions";
import { DownloadLink } from "../../download-link";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function DokumentPage({ params }: PageProps<"/intern/amtsblatt/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const store = await getStore();
  const document = await store.getDocument(id);
  if (!document) notFound();
  const template = getTemplate(document.template);
  if (!template) notFound();
  const items = countersignItems(template, document.fields, await store.listStamps([document.id]));
  const status = stampStatus(items);
  const view = certificateStamps(items);
  const request = openRequestFor(items, user.roles);
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
              stamps: view.stamps,
              pending: view.pending,
            }}
          />
        </div>
      </section>

      <aside className="glass-panel p-7 lg:sticky lg:top-6">
        <p className="text-sm tabular-nums text-muted">{document.number}</p>
        <h1 className="mt-1 font-serif text-[1.75rem] font-medium leading-tight">{template.title}</h1>
        {items.length > 0 && (
          <p
            className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-medium ${
              status === "valid" ? "bg-[#2f6f4f]/12 text-[#245a40]" : status === "void" ? "bg-accent/12 text-accent" : "bg-[#b08a2e]/15 text-[#7a5f14]"
            }`}
          >
            {STATUS_LABEL[status]}
          </p>
        )}
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
        {items.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-ink/10 pt-5">
            <h2 className="text-sm font-medium">Gegenzeichnung</h2>
            <ul className="space-y-1.5 text-sm">
              {items.map((item) => (
                <li key={item.requirement.label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>{item.requirement.label}</span>
                  <span className={item.rejected ? "text-accent" : item.stamp ? "text-[#245a40]" : "text-muted"}>
                    {item.stamp
                      ? `${item.stamp.decision} · ${fullName(item.stamp.signerHonorific, item.stamp.signerName)}`
                      : item.requirement.note ?? "offen"}
                  </span>
                </li>
              ))}
            </ul>
            {request && (document.issuedBy !== user.id || devLoginEnabled()) && (
              <form action={stampDocument} className="flex flex-wrap gap-2 pt-2">
                <input type="hidden" name="document" value={document.id} />
                {request.item.requirement.decisions.map((decision, index) => (
                  <button
                    key={decision}
                    type="submit"
                    name="decision"
                    value={decision}
                    className={
                      index === 0
                        ? "liquid-solid rounded-full px-5 py-2.5 text-sm font-medium text-white"
                        : "rounded-full border border-accent/40 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/5"
                    }
                  >
                    {decision.charAt(0).toUpperCase() + decision.slice(1)}
                  </button>
                ))}
              </form>
            )}
          </div>
        )}
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
