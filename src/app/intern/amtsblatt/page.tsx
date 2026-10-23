import { fullName } from "@/lib/server/db/types";
import Link from "next/link";
import { countersignItems, STATUS_LABEL, stampStatus } from "@/lib/amtsblatt/countersign";
import { subjectOf } from "@/lib/amtsblatt/template-kit";
import { getTemplate } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";

const ISSUED = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function AmtsblattPage() {
  await requireUser();
  const store = await getStore();
  const documents = await store.listDocuments(200);
  const stamps = await store.listStamps(documents.map((document) => document.id));
  // Open countersignatures show next to each document, so a pending one is never overlooked.
  const statusOf = (document: (typeof documents)[number]) => {
    const template = getTemplate(document.template);
    if (!template) return "";
    const items = countersignItems(template, document.fields, stamps.filter((stamp) => stamp.documentId === document.id));
    return items.length === 0 ? "" : STATUS_LABEL[stampStatus(items)];
  };

  return (
    <section className="glass-panel p-8 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl font-medium">Amtsblatt</h1>
        <Link href="/intern/amtsblatt/neu" className="liquid-solid rounded-full px-6 py-3 text-sm font-medium text-white">
          Urkunde ausfertigen
        </Link>
      </div>

      {documents.length === 0 ? (
        <p className="mt-6 text-ink/70">Noch keine Urkunden. Fertige die erste aus.</p>
      ) : (
        <div className="rk-table glass-inset mt-8 overflow-x-auto rounded-[1.5rem]">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead className="bg-navy/90 text-white">
              <tr>
                <th className="px-4 py-3.5 text-xs font-medium">Nummer</th>
                <th className="px-4 py-3.5 text-xs font-medium">Urkunde</th>
                <th className="px-4 py-3.5 text-xs font-medium">Unterzeichnet</th>
                <th className="px-4 py-3.5 text-xs font-medium">Stand</th>
                <th className="px-4 py-3.5 text-xs font-medium">Ausgefertigt</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-ink/10">
                  <td className="px-4 py-3.5 tabular-nums">
                    <Link href={`/intern/amtsblatt/${document.id}`} className="rk-ref">
                      {document.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {getTemplate(document.template)?.title ?? document.template}: {subjectOf(document.fields)}
                  </td>
                  <td className="px-4 py-3.5">{fullName(document.signerHonorific, document.signerName)}</td>
                  <td className="px-4 py-3.5 text-xs">{statusOf(document)}</td>
                  <td className="px-4 py-3.5 tabular-nums">{ISSUED.format(new Date(document.issuedAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
