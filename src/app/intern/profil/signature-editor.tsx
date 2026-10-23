"use client";

import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { SignatureVector } from "@/components/certificate/signature-vector";
import { parseSignature, SIGNATURE_LIMITS, SIGNATURE_PAD, strokePath, type DrawnSignature, type SignaturePoint } from "@/lib/amtsblatt/drawn-signature";
import { toast } from "@/lib/toast";
import { saveSignature, type SignatureFormState } from "../actions";

function ToolIcon({ kind }: { kind: "undo" | "redo" | "clear" | "pen" | "check" }) {
  const path = {
    undo: "M9 5 4 10l5 5M4 10h9a6 6 0 0 1 6 6v2",
    redo: "m15 5 5 5-5 5m5-5h-9a6 6 0 0 0-6 6v2",
    clear: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5",
    pen: "m4 16-1 5 5-1L20 8l-4-4L4 16Zm9-9 4 4",
    check: "m5 12 4 4L19 6",
  }[kind];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4"><path d={path} /></svg>;
}

const tool = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink/70 transition-colors hover:bg-navy/5 disabled:opacity-30 disabled:hover:bg-transparent";
const copyStrokes = (strokes: SignaturePoint[][]) => strokes.map((stroke) => stroke.map(([x, y]): SignaturePoint => [x, y]));

export function SignatureEditor({ initial, name }: { initial: DrawnSignature | null; name: string }) {
  const [strokes, setStrokes] = useState<SignaturePoint[][]>(() => copyStrokes(initial?.strokes ?? []));
  const [height, setHeight] = useState(initial?.height ?? SIGNATURE_PAD.height);
  const [redo, setRedo] = useState<SignaturePoint[][]>([]);
  const [state, action, pending] = useActionState<SignatureFormState, FormData>(saveSignature, {});
  const [keyboard, setKeyboard] = useState(false);
  const [penDown, setPenDown] = useState(false);
  const [cursor, setCursor] = useState<SignaturePoint>([220, 150]);
  const [limit, setLimit] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef<number | null>(null);
  const live = useRef(strokes);
  const helpId = useId();
  const signature: DrawnSignature = { version: 1, height, strokes: strokes.filter((stroke) => stroke.length > 1) };
  const savedSignature = state.signature ?? initial;
  const saved = savedSignature ? JSON.stringify(savedSignature) : "";
  const valid = parseSignature(signature);
  const serialized = JSON.stringify(signature);
  const dirty = serialized !== saved;

  function update(next: SignaturePoint[][]) {
    live.current = next;
    setStrokes(next);
  }

  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (live.current.length || pointer.current !== null) return;
      const rect = node.getBoundingClientRect();
      setHeight(Math.max(180, Math.min(1000, Math.round(rect.height / Math.max(rect.width, 1) * 1000))));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!state.at) return;
    if (state.error) toast.error("Unterschrift nicht gespeichert", { description: state.error });
    else if (state.saved && state.signature) {
      toast.success("Unterschrift gespeichert", { description: "Sie wird für neue Urkunden und Gegenzeichnungen verwendet." });
    }
  }, [state]);

  function start(point: SignaturePoint) {
    if (pending || live.current.length >= SIGNATURE_LIMITS.strokes) { setLimit(true); return false; }
    setRedo([]);
    setLimit(false);
    update([...live.current, [point]]);
    return true;
  }

  function append(points: SignaturePoint[]) {
    const current = live.current;
    if (!current.length) return;
    const last = [...current[current.length - 1]];
    let count = current.reduce((sum, stroke) => sum + stroke.length, 0);
    for (const point of points) {
      const before = last.at(-1)!;
      if (Math.hypot(point[0] - before[0], point[1] - before[1]) < 1.2) continue;
      if (count >= SIGNATURE_LIMITS.points) { setLimit(true); break; }
      last.push(point);
      count++;
    }
    update([...current.slice(0, -1), last]);
  }

  function position(event: { clientX: number; clientY: number }): SignaturePoint {
    const matrix = svg.current!.getScreenCTM()!.inverse();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return [Math.round(Math.max(0, Math.min(SIGNATURE_PAD.width, point.x)) * 10) / 10, Math.round(Math.max(0, Math.min(height, point.y)) * 10) / 10];
  }

  function onDown(event: PointerEvent<SVGSVGElement>) {
    if (pending || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0) || pointer.current !== null) return;
    event.preventDefault();
    setKeyboard(false);
    setPenDown(false);
    if (!start(position(event))) return;
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onMove(event: PointerEvent<SVGSVGElement>) {
    if (pointer.current !== event.pointerId || pending) return;
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
    append((events.length ? events : [event.nativeEvent]).map(position));
  }

  function finish(event: PointerEvent<SVGSVGElement>) {
    if (pointer.current !== event.pointerId) return;
    if (event.type === "pointerup") append([position(event)]);
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    update(live.current.filter((stroke) => stroke.length > 1));
  }

  function undo() {
    if (!live.current.length || pending) return;
    const removed = live.current.at(-1)!;
    setRedo((current) => [...current, removed]);
    update(live.current.slice(0, -1));
    setPenDown(false);
    setLimit(false);
  }

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (pending) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); return; }
    if (!keyboard) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!penDown) setPenDown(start(cursor));
      else { setPenDown(false); update(live.current.filter((stroke) => stroke.length > 1)); }
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const step = event.shiftKey ? 24 : 8;
      const next: SignaturePoint = [Math.max(0, Math.min(1000, cursor[0] + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0))), Math.max(0, Math.min(height, cursor[1] + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)))];
      setCursor(next);
      if (penDown) append([next]);
    } else if (event.key === "Escape" || event.key === "Tab") setPenDown(false);
  }

  return (
    <form action={action} className="glass-panel overflow-hidden p-5 sm:p-7 lg:p-8">
      <input type="hidden" name="signature" value={serialized} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Persönlich unterzeichnet</p>
          <h2 className="mt-2 font-serif text-3xl font-medium">Deine Unterschrift</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${saved && !dirty ? "bg-[#2f6f4f]/10 text-[#245a40]" : "bg-navy/6 text-navy/65"}`}>
          {saved && !dirty && <ToolIcon kind="check" />}{saved && !dirty ? "Gespeichert" : strokes.length ? "Nicht gespeichert" : "Noch nicht hinterlegt"}
        </span>
      </div>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/65">Zeichne mit Maus, Stift oder Finger. Deine Handschrift erscheint danach auf deinen Urkunden und Gegenzeichnungen.</p>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#c7bda8]/65 bg-[#fffdf7] shadow-[inset_0_1px_0_white,0_8px_24px_-20px_rgb(22_38_58/0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-ink/8 px-2 py-1.5">
          <span className="inline-flex items-center gap-2 px-2 text-xs text-ink/50"><ToolIcon kind="pen" />Blaue Tinte</span>
          <div className="flex flex-wrap gap-0.5">
            <button type="button" disabled={pending || !strokes.length} className={tool} onClick={undo} title="Letzten Strich rückgängig machen"><ToolIcon kind="undo" /><span>Zurück</span></button>
            <button type="button" disabled={pending || !redo.length} className={tool} onClick={() => { update([...live.current, redo.at(-1)!]); setRedo(redo.slice(0, -1)); }} title="Strich wiederherstellen"><ToolIcon kind="redo" /><span>Vor</span></button>
            <button type="button" disabled={pending || !strokes.length} className={tool} onClick={() => { setRedo([]); update([]); setPenDown(false); setLimit(false); const rect = svg.current!.getBoundingClientRect(); setHeight(Math.max(180, Math.min(1000, Math.round(rect.height / Math.max(rect.width, 1) * 1000)))); }}><ToolIcon kind="clear" /><span>Leeren</span></button>
          </div>
        </div>
        <div className="relative bg-[radial-gradient(circle_at_1px_1px,rgb(22_38_58/0.08)_1px,transparent_0)] bg-[length:20px_20px]">
          <svg ref={svg} viewBox={`0 0 1000 ${height}`} role="group" aria-label="Unterschrift zeichnen" aria-describedby={helpId} aria-disabled={pending} tabIndex={0} className={`relative z-10 block h-56 w-full touch-none select-none sm:h-64 ${pending ? "cursor-wait opacity-60" : "cursor-crosshair"}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { pointer.current = null; }} onKeyDown={onKey}>
            <path d={`M 60 ${height * 0.77} H 940`} stroke="#c7bda8" strokeWidth="1" strokeDasharray="5 7" fill="none" />
            <g fill="none" stroke={SIGNATURE_PAD.ink} strokeWidth={SIGNATURE_PAD.weight} strokeLinecap="round" strokeLinejoin="round">
              {strokes.map((stroke, index) => <path key={index} d={strokePath(stroke)} />)}
            </g>
            {keyboard && <circle cx={cursor[0]} cy={cursor[1]} r="8" fill={penDown ? SIGNATURE_PAD.ink : "white"} stroke={SIGNATURE_PAD.ink} strokeWidth="2" />}
          </svg>
          {!strokes.length && !keyboard && <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4 text-ink/30"><span className="font-serif text-2xl italic">Hier unterschreiben</span><span className="mt-2 text-xs">So, wie du es auf Papier tun würdest.</span></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/8 bg-white/70 px-4 py-3">
          <p id={helpId} className="text-xs leading-relaxed text-ink/50">{keyboard ? "Pfeiltasten bewegen · Leertaste hebt/senkt den Stift · Esc beendet den Strich" : "Mehrere Striche sind möglich. Die Linie hilft nur beim Zeichnen."}</p>
          <button type="button" aria-pressed={keyboard} disabled={pending} className="rounded-lg px-1 py-1 text-xs font-medium text-navy underline decoration-navy/25 underline-offset-4 hover:decoration-navy" onClick={() => { setKeyboard(!keyboard); setPenDown(false); if (!keyboard) { setCursor([220, height / 2]); svg.current?.focus(); } }}>Mit Tastatur zeichnen</button>
        </div>
      </div>

      {limit && <p role="alert" className="mt-3 text-sm text-accent">Die Zeichenfläche ist voll. Nimm einen Strich zurück oder beginne neu.</p>}
      <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-white/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-medium text-ink/55">So erscheint sie auf der Urkunde</p><p className="mt-1 text-sm text-ink/75">{name || "Dein Dienstname"}</p></div>
        <div className="h-16 w-full max-w-60 border-b border-ink/20">{valid ? <SignatureVector signature={valid} /> : <span className="flex h-full items-center justify-center text-xs text-ink/35">Deine Vorschau</span>}</div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="max-w-sm text-xs leading-relaxed text-muted">{pending ? "Deine Unterschrift wird gespeichert …" : "Änderungen gelten für neue Unterschriften. Bereits ausgestellte Urkunden bleiben unverändert."}</p>
        <button type="submit" disabled={pending || !valid || !dirty || penDown} className="liquid-solid inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white disabled:opacity-45 sm:w-auto">
          {pending ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" /> : <ToolIcon kind="check" />}
          {pending ? "Speichert …" : "Unterschrift speichern"}
        </button>
      </div>
    </form>
  );
}
