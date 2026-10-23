import "server-only";
import { certificateStamps, countersignItems, STATUS_LABEL, stampStatus } from "@/lib/amtsblatt/countersign";
import { renderCertificate } from "@/lib/amtsblatt/pdf";
import { formatDate, type Template } from "@/lib/amtsblatt/templates";
import { subjectOf } from "@/lib/amtsblatt/template-kit";
import { appUrl } from "@/lib/server/auth/config";
import { fullName, type DocumentRecord, type StampRecord } from "@/lib/server/db/types";
import { attachedFile, container, linkButtons, plain, separator, text, type DiscordComponent } from "./components";
import { sendWebhook, webhookUrl } from "./webhook";

// Announces an issued document in the Amtsblatt channel: the certificate wording as a card, the
// PDF attached, a button to the document. The wording comes from the same blocks as the certificate.
const ACCENT = { sicherheitsrat: 0x9a1e2e, fjd: 0x1d3152, kamora: 0x6b5032, gericht: 0x3b2a5c } as const;

function isProduction() {
  return process.env.VERCEL_ENV === "production";
}

// A countersignature was added: a short card in the same channel, with the refreshed PDF.
export async function announceStamp(document: DocumentRecord, template: Template, stamp: StampRecord) {
  if (!webhookUrl("amtsblatt")) return;
  const { getStore } = await import("@/lib/server/db");
  const stamps = await (await getStore()).listStamps([document.id]);
  const items = countersignItems(template, document.fields, stamps);
  const status = stampStatus(items);
  const view = certificateStamps(items);
  const fileName = `${document.number}.pdf`;
  const pdf = await renderCertificate(document, template, view.stamps, view.pending);

  const message = container(
    status === "void" ? 0x9a1e2e : status === "valid" ? 0x2f6f4f : 0xb08a2e,
    ...(isProduction() ? [] : [text("-# Staging-Test, kein echtes Amtsblatt")]),
    text(`-# AMTSBLATT NR. ${document.number} · GEGENZEICHNUNG`),
    text(`## ${template.title}: ${plain(subjectOf(document.fields))}`),
    text(`**${plain(stamp.decision)}** durch ${plain(fullName(stamp.signerHonorific, stamp.signerName))}, ${plain(stamp.signerTitle)}`),
    separator(1),
    text(`-# Stand: ${STATUS_LABEL[status]}`),
    attachedFile(fileName),
    linkButtons({ label: "Im Amtsblatt öffnen", url: `${appUrl()}/intern/amtsblatt/${document.id}` }),
  );
  await sendWebhook("amtsblatt", [message], [{ name: fileName, data: pdf, type: "application/pdf" }]);
}

export async function announceDocument(document: DocumentRecord, template: Template) {
  // Skip the PDF render when there is nowhere to send it.
  if (!webhookUrl("amtsblatt")) return;

  const fields = { ...document.fields };
  const body: DiscordComponent[] = template.blocks(fields).map((block) => {
    const value = plain(block.text);
    if (block.kind === "name") return text(`### ${value}`);
    if (block.kind === "office") return text(`**${value.toUpperCase()}**`);
    return text(value);
  });

  const fileName = `${document.number}.pdf`;
  const open = certificateStamps(countersignItems(template, document.fields, []));
  const pdf = await renderCertificate(document, template, open.stamps, open.pending);

  const message = container(
    ACCENT[template.seal],
    ...(isProduction() ? [] : [text("-# Staging-Test, kein echtes Amtsblatt")]),
    text(`-# AMTSBLATT NR. ${document.number}`),
    text(`## ${template.title}`),
    text(`-# ${plain(template.formula)} · ${plain(template.issuer)}`),
    separator(2),
    ...body,
    separator(1),
    text(
      `-# Kamora, den ${formatDate(document.issuedAt.slice(0, 10))} · ${plain(fullName(document.signerHonorific, document.signerName))}, ${plain(document.signerTitle)}\n` +
        `-# Rechtsgrundlage: ${plain(template.legalBasis)}`,
    ),
    attachedFile(fileName),
    linkButtons({ label: "Im Amtsblatt öffnen", url: `${appUrl()}/intern/amtsblatt/${document.id}` }),
  );

  await sendWebhook("amtsblatt", [message], [{ name: fileName, data: pdf, type: "application/pdf" }]);
}
