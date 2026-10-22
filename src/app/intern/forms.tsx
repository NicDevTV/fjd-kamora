"use client";

import { useActionState } from "react";
import type { TemplateField } from "@/lib/amtsblatt/templates";
import { issueDocument, saveServiceName, type FormState } from "./actions";

const input =
  "mt-2 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 text-[1.0625rem] outline-none transition-shadow focus:border-accent/50 focus:ring-2 focus:ring-accent/25";

function Message({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p role="status" className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-ink/75">
        Gespeichert.
      </p>
    );
  }
  return null;
}

export function ServiceNameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(saveServiceName, {});
  return (
    <form action={action} className="mt-6 max-w-md space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Dienstname</span>
        <input name="serviceName" defaultValue={current} required minLength={3} maxLength={60} autoComplete="off" className={input} />
        <span className="mt-1.5 block text-xs text-muted">Der Name deines Charakters, so wie er unter Urkunden steht.</span>
      </label>
      <Message state={state} />
      <button type="submit" disabled={pending} className="liquid-solid rounded-full px-6 py-3 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Speichert …" : "Dienstnamen speichern"}
      </button>
    </form>
  );
}

export function IssueForm({
  template,
  fields,
  defaultSignerTitle,
  signerName,
}: {
  template: string;
  fields: TemplateField[];
  defaultSignerTitle: string;
  signerName: string;
}) {
  const [state, action, pending] = useActionState(issueDocument, {});
  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="template" value={template} />
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="text-sm font-medium">{field.label}</span>
          {field.type === "select" ? (
            <select name={field.name} required={field.required} className={input} defaultValue="">
              <option value="" disabled>
                Bitte wählen
              </option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type}
              required={field.required}
              maxLength={field.maxLength}
              autoComplete="off"
              className={input}
            />
          )}
        </label>
      ))}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className="text-sm font-medium">Unterschrift</span>
          <p className="mt-2 rounded-2xl border border-dashed border-ink/20 px-4 py-3 text-[1.0625rem] text-ink/80">{signerName}</p>
          <span className="mt-1.5 block text-xs text-muted">Du unterschreibst immer mit deinem eigenen Dienstnamen.</span>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Funktion unter der Unterschrift</span>
          <input name="signerTitle" defaultValue={defaultSignerTitle} maxLength={60} autoComplete="off" className={input} />
        </label>
      </div>

      <Message state={state} />
      <button type="submit" disabled={pending} className="liquid-solid rounded-full px-6 py-3.5 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Wird ausgefertigt …" : "Urkunde ausfertigen"}
      </button>
      <p className="text-xs text-muted">Ausgefertigte Urkunden erhalten eine feste Amtsblatt-Nummer und lassen sich nicht mehr ändern.</p>
    </form>
  );
}
