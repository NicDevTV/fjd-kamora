import Link from "next/link";
import { fullName } from "@/lib/server/db/types";
import { countersignItems, judicialProgress, stampStatus } from "@/lib/amtsblatt/countersign";
import { isPublicTemplate } from "@/lib/amtsblatt/publication";
import { subjectOf } from "@/lib/amtsblatt/template-kit";
import { getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";
import { DocumentIndex } from "./document-index";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

export const instant = false;

export default async function AmtsblattPage() {
  await requireUser();
  const store = await getStore();
  const documents = await store.listDocuments(1000);
  const stamps = await store.listStamps(documents.map((document) => document.id));
  const entries = documents.map((document) => {
    const template = getTemplate(document.template);
    const items = template ? countersignItems(template, document.fields, stamps.filter((stamp) => stamp.documentId === document.id)) : [];
    return {
      id: document.id,
      number: document.number,
      templateId: document.template,
      title: template?.label ?? document.template,
      subject: subjectOf(document.fields),
      group: template?.group ?? "Sonstige",
      signer: fullName(document.signerHonorific, document.signerName),
      issued: ISSUED.format(new Date(document.issuedAt)),
      public: isPublicTemplate(document.template),
      status: stampStatus(items),
      progress: template ? judicialProgress(template, items) : null,
    };
  });

  return (
    <section className="glass-panel p-5 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium">Amtsblatt & Vorgänge</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/70">Öffentliche Bekanntmachungen und vertrauliche Urkunden an einem Ort. Die Tags zeigen, was als Zusammenfassung nach Discord geht und was ausschließlich intern bleibt.</p>
        </div>
        <Link href="/intern/amtsblatt/neu" className="liquid-solid rounded-full px-6 py-3 text-sm font-medium text-white">Urkunde ausfertigen</Link>
      </div>
      <DocumentIndex entries={entries} />
    </section>
  );
}
