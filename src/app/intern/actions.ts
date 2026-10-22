"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTemplate, validateFields } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";
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

  await (await getStore()).setServiceName(user.id, name);
  return { saved: true, at };
}

export async function issueDocument(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const at = Date.now();
  if (!user.serviceName) return { error: "Lege zuerst im Profil deinen Dienstnamen fest; mit ihm wird unterschrieben.", at };

  const template = getTemplate(String(formData.get("template") ?? ""));
  if (!template) return { error: "Unbekannte Vorlage.", at };
  // Each template belongs to one office: the Föderationsrat appoints the minister, the minister his staff.
  if (!user.roles.includes(template.role)) return { error: "Diese Urkunde darf deine Rolle nicht ausfertigen.", at };

  const input = Object.fromEntries(template.fields.map((field) => [field.name, String(formData.get(field.name) ?? "")]));
  const checked = validateFields(template, input);
  if ("error" in checked) return { error: checked.error, at };

  const signerTitle = String(formData.get("signerTitle") ?? "");
  if (!template.signerTitles.includes(signerTitle)) return { error: "Bitte wähle die Funktion unter der Unterschrift.", at };

  const document = await (await getStore()).createDocument({
    template: template.id,
    fields: checked.values,
    // The signature always carries the signed-in official's own name; nobody signs for another.
    signerName: user.serviceName,
    signerTitle,
    // The seed only shapes seal and signature; a tampered value changes looks, nothing else.
    signatureSeed: seedFrom(formData.get("seed")),
    issuedBy: user.id,
  });
  setFlash(await cookies(), {
    tone: "success",
    title: `${template.title} ausgefertigt`,
    description: `Amtsblatt Nr. ${document.number} für ${checked.values.name}.`,
  });
  redirect(`/intern/amtsblatt/${document.id}`);
}
