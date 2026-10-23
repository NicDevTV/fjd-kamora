import { countersignItems, stampStatus } from "@/lib/amtsblatt/countersign";
import { publicNotice } from "@/lib/amtsblatt/publication";
import { formatDate, type Template } from "@/lib/amtsblatt/templates";
import type { DocumentRecord, StampRecord } from "@/lib/server/db/types";
import { container, documentImage, linkButtons, plain, separator, text } from "./components";

const ACCENT = { sicherheitsrat: 0x9a1e2e, fjd: 0x1d3152, kamora: 0xb08a2e, gericht: 0x3b2a5c } as const;

export function amtsblattMessage(document: DocumentRecord, template: Template, stamps: StampRecord[], options: { baseUrl: string; production: boolean }) {
  const notice = publicNotice(document);
  if (!notice || document.template !== template.id || stampStatus(countersignItems(template, document.fields, stamps)) !== "valid") return null;
  return [container(
    ACCENT[template.seal],
    ...(!options.production ? [text("-# Testveröffentlichung")] : []),
    text(`## ${template.label}`),
    text(`**${plain(notice.name)}** · ${plain(notice.office)}`),
    documentImage(`${document.number}.png`, `${notice.kind}: ${notice.name}, ${notice.office}. Öffentlicher Urkundenauszug.`),
    separator(),
    text(`-# ${plain(document.number)} · ${notice.dateLabel} ${plain(formatDate(notice.date || ""))}`),
    linkButtons({ label: "Vollständige Urkunde öffnen", url: `${options.baseUrl}/intern/amtsblatt/${document.id}` }),
  )];
}
