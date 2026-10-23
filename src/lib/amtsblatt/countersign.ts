import type { Role, StampRecord } from "@/lib/server/db/types";
import type { Countersign, Template } from "./template-kit";
import type { DrawnSignature } from "./drawn-signature";

// Countersignatures (Gegenzeichnung): which offices still have to stamp a document, whether it is
// valid yet, and what the stamps look like on the certificate. Pure logic, shared by pages, the PDF and
// the Discord message.

export type StampStatus = "valid" | "pending" | "void";

export type CountersignItem = {
  slot: string;
  requirement: Countersign;
  stamp: StampRecord | null;
  // True if the stamp says the opposite of consent: the document is void.
  rejected: boolean;
};

export function countersignItems(template: Template, fields: Record<string, string>, stamps: StampRecord[]): CountersignItem[] {
  const requirements = template.countersigns?.(fields) ?? [];
  const used = new Set<string>();
  const people = new Set<string>();
  return requirements.map((requirement) => {
    const slot = requirement.key ?? requirement.label;
    const stamp = stamps.find((entry) =>
      !used.has(entry.id) && !people.has(entry.stampedBy) && requirement.roles.includes(entry.role) &&
      (entry.slot === slot || entry.slot === entry.role),
    ) ?? null;
    if (stamp) {
      used.add(stamp.id);
      people.add(stamp.stampedBy);
    }
    return { slot, requirement, stamp, rejected: stamp !== null && stamp.decision === requirement.decisions[1] };
  });
}

export function stampStatus(items: CountersignItem[]): StampStatus {
  if (items.some((item) => item.rejected)) return "void";
  return items.every((item) => item.stamp) ? "valid" : "pending";
}

export const STATUS_LABEL: Record<StampStatus, string> = {
  valid: "Gültig",
  pending: "Wartet auf Gegenzeichnung",
  void: "Aufgehoben",
};

// The first open request a user can answer with one of their roles; nobody countersigns their own document.
export function openRequestFor(items: CountersignItem[], userRoles: Role[], userId: string) {
  if (items.some((item) => item.stamp?.stampedBy === userId) || stampStatus(items) === "void") return null;
  for (const [index, item] of items.entries()) {
    if (item.stamp) continue;
    if (item.requirement.afterPrevious && items.slice(0, index).some((previous) => !previous.stamp)) continue;
    const role = item.requirement.roles.find((candidate) => userRoles.includes(candidate));
    if (role) return { item, role };
  }
  return null;
}

export function judicialProgress(template: Template, items: CountersignItem[]) {
  if (!template.judicialQuorum) return null;
  const judges = items.filter((item) => item.requirement.roles.includes("ogh_richter"));
  return `${1 + judges.filter((item) => item.stamp).length} von 3 richterlichen Unterschriften`;
}

// What the certificate draws for one stamp.
export type StampView = {
  signerSignature: DrawnSignature | null;
  role: Role;
  decision: string;
  rejected: boolean;
  signerName: string;
  signerHonorific: string | null;
  signerTitle: string;
  // Id of the signing user, for their personal hand.
  signerKey: string;
  seed: number;
  stampedAt: string;
};

export type PendingView = { label: string };

export function certificateStamps(items: CountersignItem[]): { stamps: StampView[]; pending: PendingView[] } {
  const stamps: StampView[] = [];
  const pending: PendingView[] = [];
  for (const item of items) {
    if (!item.stamp) {
      pending.push({ label: item.requirement.label });
      continue;
    }
    stamps.push({
      signerSignature: item.stamp.signerSignature,
      role: item.stamp.role,
      decision: item.stamp.decision,
      rejected: item.rejected,
      signerName: item.stamp.signerName,
      signerHonorific: item.stamp.signerHonorific,
      signerTitle: item.stamp.signerTitle,
      signerKey: item.stamp.stampedBy,
      seed: item.stamp.signatureSeed,
      stampedAt: item.stamp.stampedAt,
    });
  }
  return { stamps, pending };
}
