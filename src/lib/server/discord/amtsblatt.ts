import "server-only";
import { isPublicTemplate } from "@/lib/amtsblatt/publication";
import type { Template } from "@/lib/amtsblatt/templates";
import { appUrl } from "@/lib/server/auth/config";
import type { DocumentRecord } from "@/lib/server/db/types";
import { amtsblattMessage } from "./amtsblatt-message";
import { renderPublicCertificate } from "./amtsblatt-preview";
import { sendWebhook, webhookUrl } from "./webhook";

function publishable(document: DocumentRecord, template: Template) {
  return document.template === template.id && isPublicTemplate(document.template);
}

function messageOptions() {
  return { baseUrl: appUrl(), production: process.env.VERCEL_ENV === "production" };
}

// Both issuing and countersigning pass through the same final-status and
// publication checks. The database claim also covers concurrent last signatures.
async function announceIfComplete(document: DocumentRecord, template: Template) {
  if (!publishable(document, template) || !webhookUrl("amtsblatt")) return;
  const { getStore } = await import("@/lib/server/db");
  const store = await getStore();
  const stamps = await store.listStamps([document.id]);
  const message = amtsblattMessage(document, template, stamps, messageOptions());
  if (!message) return;
  const preview = await renderPublicCertificate(document, template, stamps);
  if (!preview || !(await store.claimAnnouncement(document.id))) return;
  const result = await sendWebhook("amtsblatt", message, [{ name: `${document.number}.png`, data: preview, type: "image/png" }]);
  if (!result.ok) await store.releaseAnnouncement(document.id);
}

export const announceDocument = announceIfComplete;
export const announceStamp = announceIfComplete;
