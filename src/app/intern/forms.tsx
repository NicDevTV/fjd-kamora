"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/lib/toast";
import { saveServiceName, type FormState } from "./actions";

const input =
  "mt-2 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 text-[1.0625rem] outline-none transition-shadow focus:border-accent/50 focus:ring-2 focus:ring-accent/25";

// Every result of a form also appears as a toast; the inline message stays next to the form.
function useResultToast(state: FormState, success: string, failure: string) {
  useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error(failure, { description: state.error });
    else if (state.saved) toast.success(success);
  }, [state, success, failure]);
}

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
  useResultToast(state, "Dienstname gespeichert", "Nicht gespeichert");
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
