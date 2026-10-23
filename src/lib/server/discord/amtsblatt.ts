import "server-only";
import { renderCertificate } from "@/lib/amtsblatt/pdf";
import { formatDate, type Template } from "@/lib/amtsblatt/templates";
import { appUrl } from "@/lib/server/auth/config";
import { fullName, type DocumentRecord } from "@/lib/server/db/types";
import { attachedFile, container, linkButtons, plain, separator, text, type DiscordComponent } from "./components";
import { sendWebhook, webhookUrl } from "./webhook";

// Announces an issued document in the Amtsblatt channel: the certificate wording as a card, the
// PDF attached, a button to the document. The wording comes from the same blocks as the certificate.
const ACCENT = { foederation: 0x9a1e2e, fjd: 0x1d3152 } as const;

function isProduction() {
  return process.env.VERCEL_ENV === "production";
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
  const pdf = await renderCertificate(document, template);

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
