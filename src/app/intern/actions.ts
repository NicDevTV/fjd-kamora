"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { getTemplate, validateFields } from "@/lib/amtsblatt/templates";
import { requireUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";

// Server Actions of the internal area. Each one checks the session and role itself:
// an action is a public endpoint, the page that renders the form is no protection.

export type FormState = { error?: string; saved?: boolean };

export async function saveServiceName(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("serviceName") ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 3) return { error: "Der Dienstname braucht mindestens 3 Zeichen." };
  if (name.length > 60) return { error: "Der Dienstname darf höchstens 60 Zeichen haben." };
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(name)) return { error: "Nur Buchstaben, Leerzeichen, Punkt, Bindestrich und Apostroph." };

  await (await getStore()).setServiceName(user.id, name);
  return { saved: true };
}

export async function issueDocument(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("justizminister");
  if (!user.serviceName) return { error: "Lege zuerst im Profil deinen Dienstnamen fest; mit ihm wird unterschrieben." };

  const template = getTemplate(String(formData.get("template") ?? ""));
  if (!template) return { error: "Unbekannte Vorlage." };

  const input = Object.fromEntries(template.fields.map((field) => [field.name, String(formData.get(field.name) ?? "")]));
  const checked = validateFields(template, input);
  if ("error" in checked) return { error: checked.error };

  const signerTitle = String(formData.get("signerTitle") ?? "").replace(/\s+/g, " ").trim() || template.defaultSignerTitle;
  if (signerTitle.length > 60) return { error: "Die Funktion unter der Unterschrift ist zu lang." };

  const document = await (await getStore()).createDocument({
    template: template.id,
    fields: checked.values,
    // The signature always carries the signed-in official's own name; nobody signs for another.
    signerName: user.serviceName,
    signerTitle,
    signatureSeed: randomInt(1, 2 ** 31 - 1),
    issuedBy: user.id,
  });
  redirect(`/intern/amtsblatt/${document.id}`);
}
