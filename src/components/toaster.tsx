"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FLASH_COOKIE,
  getServerToasts,
  getToasts,
  parseFlash,
  subscribeToasts,
  toast as toastStore,
  type Toast,
  type ToastTone,
} from "@/lib/toast";

// Toasts as a stack of glass cards in 3D. Collapsed, older cards sit behind the newest one,
// smaller, tilted back and further away; only their top edges show. Hovering, focusing or
// tapping the stack fans it out into a list. Cards close on a timer that pauses while the
// stack is open, the pointer rests on it or the tab is hidden; on touch they can be swiped away.

const VISIBLE = 3;
const GAP = 12;
const EXIT_MS = 380;

function Icon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
        <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.3 10.3l2.4 2.4 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
        <path d="M10 2.6l8 14H2l8-14z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 8v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10" cy="14.2" r="0.95" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="6.2" r="0.95" fill="currentColor" />
    </svg>
  );
}

type ItemProps = {
  item: Toast;
  index: number;
  offset: number;
  frontHeight: number;
  expanded: boolean;
  paused: boolean;
  onHeight: (id: number, height: number) => void;
};

function ToastCard({ item, index, offset, frontHeight, expanded, paused, onHeight }: ItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState<"down" | "left" | "right" | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const remaining = useRef(item.duration);

  const close = useCallback(
    (direction: "down" | "left" | "right" = "down") => {
      setLeaving(direction);
      window.setTimeout(() => toastStore.dismiss(item.id), EXIT_MS);
    },
    [item.id],
  );

  // Fly in on the next frame, so the entering transform has something to animate from.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const content = node.firstElementChild as HTMLElement;
    const observer = new ResizeObserver(() => onHeight(item.id, content.offsetHeight));
    observer.observe(content);
    return () => observer.disconnect();
  }, [item.id, onHeight]);

  // Auto-close: counts down only while the card is not paused, keeping the remaining time.
  useEffect(() => {
    if (paused || leaving || !Number.isFinite(remaining.current)) return;
    const started = Date.now();
    const timer = window.setTimeout(() => close("down"), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, leaving, close]);

  function onPointerDown(event: ReactPointerEvent<HTMLLIElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLLIElement>) {
    const origin = start.current;
    if (origin && origin.id === event.pointerId) {
      const x = event.clientX - origin.x;
      const y = Math.max(0, event.clientY - origin.y);
      if (!drag.active && Math.hypot(x, y) > 6) event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ x, y, active: true });
      return;
    }
    // A mouse over the front card tips it towards the pointer.
    if (event.pointerType === "mouse" && index === 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTilt({
        x: ((event.clientY - rect.top) / rect.height - 0.5) * -8,
        y: ((event.clientX - rect.left) / rect.width - 0.5) * 10,
      });
    }
  }

  function onPointerUp() {
    const { x, y, active } = drag;
    start.current = null;
    if (active && (Math.abs(x) > 90 || y > 60)) {
      close(Math.abs(x) > y ? (x < 0 ? "left" : "right") : "down");
    }
    setDrag({ x: 0, y: 0, active: false });
  }

  const front = index === 0;
  const hidden = !expanded && index >= VISIBLE;
  const style = {
    "--i": index,
    "--offset": `${offset}px`,
    "--front-h": `${frontHeight}px`,
    "--dx": `${drag.x}px`,
    "--dy": `${drag.y}px`,
    "--rz": `${(drag.x * 0.04).toFixed(2)}deg`,
    "--tilt-x": `${front && !drag.active ? tilt.x : 0}deg`,
    "--tilt-y": `${front && !drag.active ? tilt.y : 0}deg`,
    "--duration": `${Number.isFinite(item.duration) ? item.duration : 0}ms`,
    zIndex: 100 - index,
  } as CSSProperties;

  return (
    <li
      ref={ref}
      role={item.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      data-tone={item.tone}
      data-front={front}
      data-mounted={mounted}
      data-leaving={leaving ?? undefined}
      data-dragging={drag.active}
      data-hidden={hidden}
      style={style}
      className="fjd-toast"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      onKeyDown={(event) => {
        if (event.key === "Escape") close("down");
      }}
    >
      <div className="fjd-toast-card glass-dark is-solid">
        <span className="fjd-toast-icon">
          <Icon tone={item.tone} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug text-white">{item.title}</p>
          {item.description && <p className="mt-0.5 text-sm leading-relaxed text-white/70">{item.description}</p>}
        </div>
        <button type="button" onClick={() => close("down")} aria-label="Meldung schließen" className="fjd-toast-close">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {Number.isFinite(item.duration) && <span aria-hidden="true" className="fjd-toast-progress" data-paused={paused} />}
      </div>
    </li>
  );
}

// Turns the flash cookie a server redirect left behind into a toast, then deletes it.
function consumeFlash() {
  const entry = document.cookie.split("; ").find((part) => part.startsWith(`${FLASH_COOKIE}=`));
  if (!entry) return;
  document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  const flash = parseFlash(entry.slice(FLASH_COOKIE.length + 1));
  if (flash) toastStore[flash.tone](flash.title, { description: flash.description });
}

export function Toaster({ flash }: { flash?: string }) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const pathname = usePathname();
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const region = useRef<HTMLElement>(null);

  useEffect(() => {
    consumeFlash();
  }, [pathname, flash]);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // A tap outside the opened stack folds it again (touch screens have no hover to leave).
  useEffect(() => {
    if (!pinned) return;
    const onDown = (event: PointerEvent) => {
      if (!region.current?.contains(event.target as Node)) setPinned(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pinned]);

  const onHeight = useCallback((id: number, height: number) => {
    setHeights((current) => (current[id] === height ? current : { ...current, [id]: height }));
  }, []);

  // Newest first: index 0 is the card in front.
  const ordered = [...toasts].reverse();
  const empty = ordered.length === 0;
  const expanded = !empty && (hovered || pinned) && ordered.length > 1;
  const frontHeight = heights[ordered[0]?.id] ?? 72;

  // Opened, each card sits above the ones in front of it: its offset is their heights plus gaps.
  const sizes = ordered.map((item) => (heights[item.id] ?? 72) + GAP);
  const offsets = sizes.map((_, index) => sizes.slice(0, index).reduce((sum, size) => sum + size, 0));
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const stackHeight = expanded ? total - GAP : frontHeight + Math.min(ordered.length - 1, VISIBLE - 1) * 20;

  return (
    <section
      ref={region}
      aria-label="Benachrichtigungen"
      className="fjd-toaster"
      data-expanded={expanded}
      data-empty={empty}
      style={{ height: empty ? 0 : stackHeight }}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setHovered(false);
      }}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button")) setPinned((value) => !value);
      }}
    >
      <ol>
        {ordered.map((item, index) => (
          <ToastCard
            key={item.id}
            item={item}
            index={index}
            offset={offsets[index]}
            frontHeight={frontHeight}
            expanded={expanded}
            paused={expanded || hovered || pageHidden}
            onHeight={onHeight}
          />
        ))}
      </ol>
    </section>
  );
}
