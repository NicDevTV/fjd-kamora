"use client";

import { useActionState, useEffect, useState } from "react";
import { CertificatePreview, certificateFonts } from "@/components/certificate/certificate-preview";
import { SignatureSample } from "@/components/certificate/signature-mark";
import { getTemplate } from "@/lib/amtsblatt/templates";
import { toast } from "@/lib/toast";
import { issueDocument, type FormState } from "../../actions";

const input =
  "mt-2 block min-h-[3.25rem] w-full min-w-0 max-w-full rounded-2xl [&::-webkit-date-and-time-value]:text-left [&[type=date]]:h-[3.25rem] [&[type=date]]:appearance-none [&[type=date]]:overflow-hidden [&[type=date]]:leading-[1.5] border border-ink/15 bg-white/85 px-4 py-3 text-[1.0625rem] outline-none transition-shadow placeholder:text-ink/35 focus:border-accent/50 focus:ring-2 focus:ring-accent/25";

// Form and live preview side by side: every keystroke redraws the certificate exactly as it
// will be issued. Only the number is missing until the document is filed.
export function IssueStudio({
  templateId,
  signerName,
  signerKey,
  today,
  previewSeed,
}: {
  templateId: string;
  signerName: string;
  signerKey: string;
  today: string;
  previewSeed: number;
}) {
  const template = getTemplate(templateId)!;
  const [values, setValues] = useState<Record<string, string>>({});
  const [signerTitle, setSignerTitle] = useState(template.signerTitles[0]);
  const [state, action, pending] = useActionState<FormState, FormData>(issueDocument, {});

  useEffect(() => {
    if (state.at && state.error) toast.error("Nicht ausgefertigt", { description: state.error });
  }, [state]);

  const missing = template.fields.filter((field) => field.required && !values[field.name]?.trim()).length;

  return (
    <div className={`grid items-start gap-8 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] ${certificateFonts}`}>
      <form action={action} className="glass-panel space-y-6 p-6 sm:p-8">
        <input type="hidden" name="template" value={template.id} />
        {/* The preview's seed becomes the document's: what you see is exactly what gets filed. */}
        <input type="hidden" name="seed" value={previewSeed} />

        <fieldset className="space-y-5">
          <legend className="font-serif text-xl font-medium">Angaben</legend>
          {template.fields.map((field) => (
            <label key={field.name} className="block">
              <span className="text-sm font-medium">{field.label}</span>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                  className={input}
                >
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
                  placeholder={field.placeholder}
                  autoComplete="off"
                  value={values[field.name] ?? ""}
                  onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                  className={input}
                />
              )}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="font-serif text-xl font-medium">Unterschrift</legend>
          <div className="mt-3 rounded-2xl border border-ink/10 bg-white/60 px-4 py-3">
            <SignatureSample name={signerName} seed={previewSeed} signerKey={signerKey} scale={1.15} />
            <p className="mt-2 text-xs text-muted">Du unterschreibst immer mit deinem eigenen Dienstnamen.</p>
          </div>
          <p className="mt-4 text-sm font-medium">Funktion unter der Unterschrift</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {template.signerTitles.map((title) => (
              <label
                key={title}
                className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
                  signerTitle === title ? "border-navy bg-navy text-white" : "border-ink/15 bg-white/70 text-ink/80 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="signerTitle"
                  value={title}
                  checked={signerTitle === title}
                  onChange={() => setSignerTitle(title)}
                  className="sr-only"
                />
                {title}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="border-t border-ink/10 pt-6">
          <button
            type="submit"
            disabled={pending}
            className="liquid-solid w-full rounded-full px-6 py-4 text-[0.9375rem] font-medium text-white disabled:opacity-60"
          >
            {pending ? "Wird ausgefertigt …" : missing > 0 ? `Urkunde ausfertigen (${missing} ${missing === 1 ? "Angabe fehlt" : "Angaben fehlen"})` : "Urkunde ausfertigen"}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            Die Urkunde erhält eine feste Amtsblatt-Nummer und lässt sich danach nicht mehr ändern.
          </p>
        </div>
      </form>

      <section aria-label="Vorschau" className="lg:sticky lg:top-6">
        <div className="mx-auto max-w-[36rem]">
          <CertificatePreview
            data={{
              template,
              fields: values,
              number: null,
              signerName,
              signerKey,
              signerTitle,
              seed: previewSeed,
              issuedAt: today,
            }}
          />
          <p className="mt-3 text-center text-xs text-muted">
            Live-Vorschau. So, mit diesem Siegel und dieser Unterschrift, wird die Urkunde ausgefertigt.
          </p>
        </div>
      </section>
    </div>
  );
}
