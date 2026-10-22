"use client";

import { useEffect, useRef } from "react";
import { toast, type ToastTone } from "@/lib/toast";

// Shows one toast when the page opens, e.g. for "?fehler=…" after a redirect, then removes the
// query parameter so a reload does not repeat it.
export function ToastOnLoad({
  tone,
  title,
  description,
  persistent = false,
  param,
}: {
  tone: ToastTone;
  title: string;
  description?: string;
  persistent?: boolean;
  param: string;
}) {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast[tone](title, { description, duration: persistent ? Infinity : undefined });
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState(window.history.state, "", url);
  }, [tone, title, description, persistent, param]);
  return null;
}
