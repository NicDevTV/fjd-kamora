import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { countersignItems, judicialProgress, openRequestFor, stampStatus } from "../src/lib/amtsblatt/countersign";
import { filterDocuments } from "../src/lib/amtsblatt/document-search";
import { isPublicTemplate, publicNotice } from "../src/lib/amtsblatt/publication";
import { getTemplate, TEMPLATES } from "../src/lib/amtsblatt/templates";
import { amtsblattMessage } from "../src/lib/server/discord/amtsblatt-message";

mock.module("server-only", () => ({}));
const { createSqliteStore } = await import("../src/lib/server/db/sqlite");
const root = mkdtempSync(path.join(tmpdir(), "fjd-documents-test-"));
const stores = [];
function createStore(file) {
  const store = createSqliteStore(file);
  stores.push(store);
  return store;
}
afterAll(() => {
  for (const store of stores.splice(0)) store.close();
  Bun.gc(true);
  if (!path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep + "fjd-documents-test-")) throw new Error("Unexpected test path");
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const options = { baseUrl: "https://example.test", production: true };
function documentFor(id) {
  return {
    id: "12345678-1234-1234-1234-123456789012", number: "AB-2026-0001", template: id,
    fields: { ...getTemplate(id).sample }, signerName: "Clara Dornfeld", signerHonorific: null,
    signerTitle: "Richter am Obersten Gerichtshof", signatureSeed: 100, issuedBy: "issuer", issuedAt: "2026-10-23T12:00:00.000Z",
  };
}
function signature(requirement, who, overrides = {}) {
  return {
    id: `signature-${who}`, documentId: documentFor("parteiverbot").id,
    slot: requirement.key ?? requirement.label, role: requirement.roles[0], stampedBy: who,
    decision: requirement.decisions[0], signerName: who, signerHonorific: null,
    signerTitle: "OGH-Richter", signatureSeed: 200, stampedAt: "2026-10-23T13:00:00.000Z", ...overrides,
  };
}

function newDocumentData(id, issuedBy) {
  const d = documentFor(id);
  return { template: d.template, fields: d.fields, signerName: d.signerName, signerHonorific: d.signerHonorific, signerTitle: d.signerTitle, signatureSeed: d.signatureSeed, issuedBy };
}

describe("public publication boundary", () => {
  test("only explicitly approved document types are public", () => {
    expect(TEMPLATES.filter((t) => isPublicTemplate(t.id)).map((t) => t.id).sort()).toEqual([
      "ernennung-jm", "ernennung-fjd", "ernennung-staatssekretaer", "ernennung-amtsleiter",
      "ernennung-gsta", "ernennung-richter", "ernennung-chief", "ernennung-minister",
      "entlassung-jm", "entlassung-fjd", "vereidigung", "befoerderung",
    ].sort());
    for (const id of ["ernennung-neu", "__proto__", "constructor"]) expect(isPublicTemplate(id)).toBe(false);
  });
  for (const template of TEMPLATES.filter((t) => !isPublicTemplate(t.id))) {
    test(`${template.id} never produces a public notice, including signatures`, () => {
      const document = documentFor(template.id);
      const stamps = (template.countersigns?.(document.fields) ?? []).map((r, i) => signature(r, `judge-${i}`));
      expect(publicNotice(document)).toBeNull();
      expect(amtsblattMessage(document, template, stamps, options)).toBeNull();
    });
  }
  test("an appointment stays private until its required signature is approved", () => {
    const template = getTemplate("ernennung-staatssekretaer");
    const document = documentFor(template.id);
    const requirement = template.countersigns(document.fields)[0];
    expect(amtsblattMessage(document, template, [], options)).toBeNull();
    expect(amtsblattMessage(document, template, [signature(requirement, "governor", { decision: "verweigert" })], options)).toBeNull();
    expect(amtsblattMessage(document, template, [signature(requirement, "governor")], options)).not.toBeNull();
  });
  for (const template of TEMPLATES.filter((t) => isPublicTemplate(t.id))) {
    test(`${template.id} publishes only a summary with no private reasons or PDF`, () => {
      const document = documentFor(template.id);
      document.fields = { ...document.fields, grund: "PRIVATE_REASON", art: "PRIVATE_DISMISSAL_KIND", tat: "PRIVATE_CHARGE", objekt: "PRIVATE_ADDRESS" };
      const stamps = (template.countersigns?.(document.fields) ?? []).map((r, i) => signature(r, `official-${i}`));
      const message = amtsblattMessage(document, { ...template, blocks: () => { throw new Error("Full wording must not be read"); } }, stamps, options);
      const json = JSON.stringify(message);
      expect(message).not.toBeNull();
      expect(json).toContain("/intern/amtsblatt/");
      expect(json).not.toContain("PRIVATE_");
      expect(json).toContain(`attachment://${document.number}.png`);
      expect(json).not.toContain(".pdf");
      expect(json).not.toContain('"type":13');
    });
  }
  test("template mismatches are not published", () => {
    expect(amtsblattMessage(documentFor("haftbefehl"), getTemplate("ernennung-jm"), [], options)).toBeNull();
  });
});

describe("three distinct OGH signatures", () => {
  const template = getTemplate("parteiverbot");
  const document = documentFor(template.id);
  const requirements = template.countersigns(document.fields);
  test("issuer plus two other judges are needed", () => {
    const first = signature(requirements[0], "judge-2");
    const second = signature(requirements[1], "judge-3");
    let items = countersignItems(template, document.fields, []);
    expect(stampStatus(items)).toBe("pending");
    expect(judicialProgress(template, items)).toStartWith("1 von 3");
    items = countersignItems(template, document.fields, [first]);
    expect(stampStatus(items)).toBe("pending");
    expect(judicialProgress(template, items)).toStartWith("2 von 3");
    expect(openRequestFor(items, ["ogh_richter", "oberster_richter"], "judge-2")).toBeNull();
    expect(openRequestFor(items, ["richter"], "district-judge")).toBeNull();
    expect(stampStatus(countersignItems(template, document.fields, [first, second]))).toBe("valid");
  });
  test("one person with multiple roles cannot fill both judicial positions", () => {
    const items = countersignItems(template, document.fields, [signature(requirements[0], "same-person"), signature(requirements[1], "same-person", { id: "second", role: "oberster_richter" })]);
    expect(stampStatus(items)).toBe("pending");
  });
  test("a rejection prevents unanimity and further signatures", () => {
    const items = countersignItems(template, document.fields, [signature(requirements[0], "judge-2", { decision: "abgelehnt" })]);
    expect(stampStatus(items)).toBe("void");
    expect(openRequestFor(items, ["ogh_richter"], "judge-3")).toBeNull();
  });
  test("the security council may release only after all three judges approve", () => {
    const t = getTemplate("hochverrat-todesurteil");
    const d = documentFor(t.id);
    const requirements = t.countersigns(d.fields);
    expect(openRequestFor(countersignItems(t, d.fields, []), ["sicherheitsrat"], "council")).toBeNull();
    const stamps = [signature(requirements[0], "judge-2"), signature(requirements[1], "judge-3")];
    const items = countersignItems(t, d.fields, stamps);
    expect(stampStatus(items)).toBe("pending");
    expect(openRequestFor(items, ["sicherheitsrat"], "council").item.slot).toBe("security-council-release");
    expect(stampStatus(countersignItems(t, d.fields, [...stamps, signature(requirements[2], "council")]))).toBe("valid");
  });
  test("legacy role-based signatures remain readable", () => {
    const t = getTemplate("ernennung-staatssekretaer");
    const d = documentFor(t.id);
    const old = signature(t.countersigns(d.fields)[0], "governor", { slot: "gouverneur" });
    expect(stampStatus(countersignItems(t, d.fields, [old]))).toBe("valid");
  });
});

describe("database constraints", () => {
  test("same role can sign twice, but same person or position cannot", async () => {
    const store = createStore(path.join(root, "fresh.sqlite"));
    const users = await Promise.all(["1", "2", "3"].map((id) => store.upsertDiscordUser({ discordId: id, discordName: id, avatarUrl: null })));
    const doc = await store.createDocument(newDocumentData("parteiverbot", users[0].id));
    const reqs = getTemplate("parteiverbot").countersigns(doc.fields);
    const first = { ...signature(reqs[0], users[1].id), documentId: doc.id };
    await store.addStamp(first);
    await expect(store.addStamp({ ...first, slot: reqs[1].key })).rejects.toThrow();
    await expect(store.addStamp({ ...first, stampedBy: users[2].id })).rejects.toThrow();
    await store.addStamp({ ...first, stampedBy: users[2].id, slot: reqs[1].key });
    expect(await store.listStamps([doc.id])).toHaveLength(2);
    expect(await Promise.all([store.claimAnnouncement(doc.id), store.claimAnnouncement(doc.id)])).toEqual([true, false]);
    await store.releaseAnnouncement(doc.id);
    expect(await store.claimAnnouncement(doc.id)).toBe(true);
  });
  test("old SQLite schema migrates without losing documents or signatures", async () => {
    const file = path.join(root, "legacy.sqlite");
    const original = createSqliteStore(file);
    const user = await original.upsertDiscordUser({ discordId: "123456", discordName: "Legacy signer", avatarUrl: null });
    const document = await original.createDocument(newDocumentData("ernennung-staatssekretaer", user.id));
    original.close();
    const db = new DatabaseSync(file);
    db.exec(`drop table document_stamps;
      create table document_stamps (
        id text primary key, document_id text not null references documents(id) on delete cascade,
        role text not null, stamped_by text not null references users(id), decision text not null,
        signer_name text not null, signer_honorific text, signer_title text not null,
        signature_seed integer not null, stamped_at text not null, unique(document_id, role)
      );`);
    db.prepare("insert into document_stamps values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("legacy-signature", document.id, "gouverneur", user.id, "zugestimmt", "Legacy signer", null, "Gouverneur", 123, document.issuedAt);
    db.close();
    const store = createStore(file);
    const check = new DatabaseSync(file);
    expect(check.prepare("pragma table_info(document_stamps)").all().some((column) => column.name === "slot")).toBe(true);
    check.close();
    expect(await store.listDocuments(10)).toHaveLength(1);
    const stamps = await store.listStamps([document.id]);
    expect(stamps).toHaveLength(1);
    expect(stamps[0].id).toBe("legacy-signature");
    expect(stampStatus(countersignItems(getTemplate(document.template), document.fields, stamps))).toBe("valid");
  });
});

describe("outbound announcements", () => {
  let stamps = [];
  let claims = new Set();
  let sent = [];
  let storeReads = 0;
  let deliveryOk = true;
  mock.module("../src/lib/server/auth/config", () => ({ appUrl: () => options.baseUrl }));
  mock.module("../src/lib/server/db", () => ({ getStore: async () => {
    storeReads += 1;
    return {
      listStamps: async () => stamps,
      claimAnnouncement: async (id) => { if (claims.has(id)) return false; claims.add(id); return true; },
      releaseAnnouncement: async (id) => { claims.delete(id); },
    };
  } }));
  mock.module("../src/lib/server/discord/webhook", () => ({
    webhookUrl: () => "https://example.test/local-webhook",
    sendWebhook: async (...args) => { sent.push(args); return { ok: deliveryOk }; },
  }));
  beforeEach(() => { stamps = []; claims = new Set(); sent = []; storeReads = 0; deliveryOk = true; });
  test("no public delivery until the last required signature", async () => {
    const { announceDocument, announceStamp } = await import("../src/lib/server/discord/amtsblatt");
    const d = documentFor("ernennung-staatssekretaer");
    const t = getTemplate(d.template);
    await announceDocument(d, t);
    expect(sent).toHaveLength(0);
    expect(claims.size).toBe(0);
    stamps = [signature(t.countersigns(d.fields)[0], "governor")];
    await Promise.all([announceStamp(d, t), announceStamp(d, t), announceDocument(d, t)]);
    expect(sent).toHaveLength(1);
    expect(sent[0][2]).toHaveLength(1);
    expect(sent[0][2][0].type).toBe("image/png");
    expect(JSON.stringify(sent[0][1])).toContain("Ernennung");
  }, 20000);
  test("private documents stop before store or webhook work", async () => {
    const { announceDocument, announceStamp } = await import("../src/lib/server/discord/amtsblatt");
    for (const t of TEMPLATES.filter((t) => !isPublicTemplate(t.id))) {
      await announceDocument(documentFor(t.id), t);
      await announceStamp(documentFor(t.id), t);
    }
    expect(storeReads).toBe(0);
    expect(sent).toHaveLength(0);
  });
  test("rejection is never announced and a transport failure permits retry", async () => {
    const { announceStamp } = await import("../src/lib/server/discord/amtsblatt");
    const d = documentFor("ernennung-staatssekretaer");
    const t = getTemplate(d.template);
    stamps = [signature(t.countersigns(d.fields)[0], "governor", { decision: "verweigert" })];
    await announceStamp(d, t);
    expect(sent).toHaveLength(0);
    stamps[0].decision = "zugestimmt";
    deliveryOk = false;
    await announceStamp(d, t);
    expect(claims.size).toBe(0);
    deliveryOk = true;
    await announceStamp(d, t);
    expect(claims.size).toBe(1);
  }, 20000);
});

describe("document search", () => {
  const entries = [{ id: "1", number: "AB-2026-1", title: "Ernennung", subject: "Jürgen Groß", signer: "Gouverneur", group: "Ernennung", public: true, status: "valid" }, { id: "2", number: "AB-2026-2", title: "Haftbefehl", subject: "Max Mustermann", signer: "Richter", group: "Beschlüsse", public: false, status: "pending" }];
  const filter = { query: "", group: "", visibility: "", status: "" };
  test("search ignores case and diacritics and combines terms", () => expect(filterDocuments(entries, { ...filter, query: "JURGEN gross gouverneur" }).map((d) => d.id)).toEqual(["1"]));
  test("tags and status filters combine", () => expect(filterDocuments(entries, { ...filter, visibility: "internal", status: "pending", group: "Beschlüsse" }).map((d) => d.id)).toEqual(["2"]));
  test("empty results and reset", () => {
    expect(filterDocuments(entries, { ...filter, query: "unbekannt" })).toEqual([]);
    expect(filterDocuments(entries, filter)).toHaveLength(2);
  });
});
