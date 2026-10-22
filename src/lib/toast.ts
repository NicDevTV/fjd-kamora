// Toast store. Any client code calls toast.success(...) and friends; the Toaster in the root
// layout renders the stack. Server code cannot reach this store directly, so it leaves a
// short-lived flash cookie (lib/server/flash.ts) that the Toaster turns into a toast.

export type ToastTone = "success" | "error" | "info";

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  // Milliseconds until it closes by itself; Infinity keeps it until dismissed.
  duration: number;
};

type Options = { description?: string; duration?: number };

const DEFAULT_DURATION: Record<ToastTone, number> = { success: 5000, info: 5000, error: 8000 };
// Older toasts beyond this are dropped; the stack shows only the front few.
const MAX_TOASTS = 6;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function push(tone: ToastTone, title: string, options: Options = {}) {
  const item: Toast = {
    id: nextId++,
    tone,
    title,
    description: options.description,
    duration: options.duration ?? DEFAULT_DURATION[tone],
  };
  toasts = [...toasts, item].slice(-MAX_TOASTS);
  emit();
  return item.id;
}

export const toast = {
  success: (title: string, options?: Options) => push("success", title, options),
  error: (title: string, options?: Options) => push("error", title, options),
  info: (title: string, options?: Options) => push("info", title, options),
  dismiss(id: number) {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
  },
};

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return toasts;
}

const EMPTY: Toast[] = [];
export function getServerToasts() {
  return EMPTY;
}

// Shape of the flash cookie. Validated on read: the cookie is set by the server, but anything
// in a browser can be tampered with, so only known tones and plain strings get through.
export const FLASH_COOKIE = "fjd_flash";
export type Flash = { tone: ToastTone; title: string; description?: string };

export function parseFlash(raw: string): Flash | null {
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Flash>;
    if (value.tone !== "success" && value.tone !== "error" && value.tone !== "info") return null;
    if (typeof value.title !== "string" || !value.title || value.title.length > 120) return null;
    const description =
      typeof value.description === "string" && value.description.length <= 300 ? value.description : undefined;
    return { tone: value.tone, title: value.title, description };
  } catch {
    return null;
  }
}
