"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { countersignItems, openRequestFor } from "@/lib/amtsblatt/countersign";
import { subjectOf } from "@/lib/amtsblatt/template-kit";
import { getTemplate, titlesFor, validateFields } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { devLoginEnabled } from "@/lib/server/auth/config";
import { announceDocument, announceStamp } from "@/lib/server/discord/amtsblatt";
import { getStore } from "@/lib/server/db";
import { HONORIFICS, ROLE_TITLES } from "@/lib/server/db/types";
import { setFlash } from "@/lib/server/flash";

// Server Actions of the internal area. Each one checks the session and role itself:
// an action is a public endpoint, the page that renders the form is no protection.

function seedFrom(value: FormDataEntryValue | null) {
  const seed = Number(value);
  return Number.isInteger(seed) && seed > 0 && seed < 2 ** 31 ? seed : randomInt(1, 2 ** 31 - 1);
}

// "at" changes with every submission, so the form shows a toast even for a repeated result.
export type FormState = { error?: string; saved?: boolean; at?: number };

export async function saveServiceName(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("serviceName") ?? "").replace(/\s+/g, " ").trim();
  const at = Date.now();
  if (name.length < 3) return { error: "Der Dienstname braucht mindestens 3 Zeichen.", at };
  if (name.length > 60) return { error: "Der Dienstname darf höchstens 60 Zeichen haben.", at };
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(name)) return { error: "Nur Buchstaben, Leerzeichen, Punkt, Bindestrich und Apostroph.", at };
  // Titles have their own field, so the handwritten signature never starts with "Dr.".
  if (/^(dr|prof)\b\.?/i.test(name)) return { error: "Titel wie Dr. oder Prof. wählst du im Feld „Titel“; sie gehören nicht in den Namen.", at };
  const honorific = String(formData.get("honorific") ?? "").trim();
  if (honorific && !(HONORIFICS as readonly string[]).includes(honorific)) return { error: "Unbekannter Titel.", at };

  await (await getStore()).setServiceName(user.id, name, honorific || null);
  return { saved: true, at };
}

// Another office stamps an issued document: consent, review or objection (Gegenzeichnung).
export async function stampDocument(formData: FormData) {
  const user = await requireUser();
  const store = await getStore();
  const document = await store.getDocument(String(formData.get("document") ?? ""));
  const template = document ? getTemplate(document.template) : null;
  if (!document || !template) redirect("/intern/amtsblatt");

  const back = `/intern/amtsblatt/${document.id}`;
  const fail = async (title: string, description: string) => {
    setFlash(await cookies(), { tone: "error", title, description });
    redirect(back);
  };

  if (!user.serviceName) return fail("Dienstnamen fehlt", "Lege zuerst im Profil deinen Dienstnamen fest.");
  // Nobody countersigns their own document. The local test accounts are the one exception, so the flow can be tried.
  if (document.issuedBy === user.id && !devLoginEnabled()) return fail("Nicht möglich", "Die eigene Urkunde zeichnest du nicht selbst gegen.");

  const stamps = await store.listStamps([document.id]);
  const open = openRequestFor(countersignItems(template, document.fields, stamps), user.roles);
  if (!open) return fail("Nicht möglich", "Für diese Urkunde ist keine Gegenzeichnung von deinem Amt offen.");

  const decision = String(formData.get("decision") ?? "");
  if (!open.item.requirement.decisions.includes(decision)) return fail("Nicht möglich", "Unbekannte Entscheidung.");

  const stamp = await store.addStamp({
    documentId: document.id,
    role: open.role,
    stampedBy: user.id,
    decision,
    signerName: user.serviceName,
    signerHonorific: user.honorific,
    signerTitle: ROLE_TITLES[open.role][0],
    signatureSeed: seedFrom(null),
  });
  after(() => announceStamp(document, template, stamp).catch((error) => console.error("[discord] stamp announcement failed:", error)));
  setFlash(await cookies(), { tone: "success", title: `${open.item.requirement.label}: ${decision}`, description: `Amtsblatt Nr. ${document.number}.` });
  redirect(back);
}

export async function issueDocument(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const at = Date.now();
  if (!user.serviceName) return { error: "Lege zuerst im Profil deinen Dienstnamen fest; mit ihm wird unterschrieben.", at };

  const template = getTemplate(String(formData.get("template") ?? ""));
  if (!template) return { error: "Unbekannte Vorlage.", at };
  // Each template belongs to certain offices: the Sicherheitsrat appoints the minister, the minister his staff.
  if (!template.roles.some((role) => user.roles.includes(role))) return { error: "Diese Urkunde darf deine Rolle nicht ausfertigen.", at };

  const input = Object.fromEntries(template.fields.map((field) => [field.name, String(formData.get(field.name) ?? "")]));
  const checked = validateFields(template, input);
  if ("error" in checked) return { error: checked.error, at };

  const signerTitle = String(formData.get("signerTitle") ?? "");
  if (!titlesFor(template, user.roles).includes(signerTitle)) return { error: "Bitte wähle die Funktion unter der Unterschrift.", at };

  const document = await (await getStore()).createDocument({
    template: template.id,
    fields: checked.values,
    // The signature always carries the signed-in official's own name; nobody signs for another.
    signerName: user.serviceName,
    signerHonorific: user.honorific,
    signerTitle,
    // The seed only shapes seal and signature; a tampered value changes looks, nothing else.
    signatureSeed: seedFrom(formData.get("seed")),
    issuedBy: user.id,
  });
  // Announce in the Amtsblatt channel once the response is out; a Discord outage never blocks issuing.
  after(() => announceDocument(document, template).catch((error) => console.error("[discord] announcement failed:", error)));
  setFlash(await cookies(), {
    tone: "success",
    title: `${template.title} ausgefertigt`,
    description: `Amtsblatt Nr. ${document.number} für ${subjectOf(checked.values)}.`,
  });
  redirect(`/intern/amtsblatt/${document.id}`);
}
