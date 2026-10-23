import { afterAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { parseSignature, signatureGeometry, strokePath } from "../src/lib/amtsblatt/drawn-signature";
import { getTemplate, TEMPLATES } from "../src/lib/amtsblatt/templates";
import { publicCertificateInput, isPublicTemplate } from "../src/lib/amtsblatt/publication";

mock.module("server-only", () => ({}));
const { createSqliteStore } = await import("../src/lib/server/db/sqlite");
const { renderPublicCertificate } = await import("../src/lib/server/discord/amtsblatt-preview");
const hand = { version: 1, height: 300, strokes: [[[100, 150], [180, 70], [140, 210], [280, 160], [320, 180]], [[120, 230], [480, 200]]] };
const changed = { ...hand, strokes: [[[100, 120], [240, 80], [370, 200]]] };
const root = mkdtempSync(path.join(os.tmpdir(), "fjd-signature-test-"));
const stores = [];
afterAll(() => {
  for (const store of stores.splice(0)) store.close();
  Bun.gc(true);
  if (!path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + "fjd-signature-test-")) throw new Error("Unexpected test path");
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe("pen data validation", () => {
  test("roundtrips numeric strokes and preserves their aspect", () => {
    expect(parseSignature(JSON.stringify(hand))).toEqual(hand);
    expect(signatureGeometry(hand).paths).toEqual(hand.strokes.map(strokePath));
    expect(parseSignature({ ...hand, height: 700 })).not.toBeNull();
  });
  for (const bad of [null, "<svg onload=alert(1)>", {}, { ...hand, version: 2 }, { ...hand, strokes: [] }, { ...hand, height: 999999 }, { ...hand, strokes: [[[1, 1], [2, 2]]] }, { ...hand, strokes: [[[0, 0], [Infinity, 2]]] }, { ...hand, strokes: [[[0, 0], [-1, 2]]] }, { ...hand, strokes: [[[0, 0], [2, 400]]] }, { ...hand, strokes: [[[0, 0], [2, "script"]]] }, { ...hand, strokes: Array(65).fill([[0, 0], [100, 100]]) }, { ...hand, strokes: [Array(8001).fill([1, 1])] }]) {
    test(`rejects malformed or oversized input ${JSON.stringify(bad)?.slice(0, 80)}`, () => expect(parseSignature(bad)).toBeNull());
  }
});

test("profile edits never change document or countersignature snapshots", async () => {
  const store = createSqliteStore(path.join(root, "snapshots.sqlite"));
  stores.push(store);
  const issuer = await store.upsertDiscordUser({ discordId: "123456", discordName: "Issuer", avatarUrl: null });
  const signer = await store.upsertDiscordUser({ discordId: "123457", discordName: "Countersigner", avatarUrl: null });
  await store.setSignature(issuer.id, hand);
  await store.setSignature(signer.id, hand);
  const document = await store.createDocument({ template: "ernennung-staatssekretaer", fields: getTemplate("ernennung-staatssekretaer").sample, signerName: "Clara Dornfeld", signerHonorific: null, signerTitle: "Justizminister", signatureSeed: 1, signerSignature: (await store.getUser(issuer.id)).signature, issuedBy: issuer.id });
  await store.addStamp({ documentId: document.id, slot: "Zustimmung des Gouverneurs", role: "gouverneur", stampedBy: signer.id, decision: "zugestimmt", signerName: "Helena Vorwerk", signerHonorific: null, signerTitle: "Gouverneur", signatureSeed: 2, signerSignature: (await store.getUser(signer.id)).signature });
  await store.setSignature(issuer.id, changed);
  await store.setSignature(signer.id, changed);
  expect((await store.getUser(issuer.id)).signature).toEqual(changed);
  expect((await store.getDocument(document.id)).signerSignature).toEqual(hand);
  expect((await store.listStamps([document.id]))[0].signerSignature).toEqual(hand);
});

describe("public document image", () => {
  function documentFor(template) {
    return { id: "12345678-1234-1234-1234-123456789012", number: "AB-2026-0001", template: template.id, fields: { ...template.sample }, signerName: "Clara Dornfeld", signerHonorific: null, signerTitle: "Justizminister", signatureSeed: 123, signerSignature: hand, issuedBy: "issuer", issuedAt: "2026-10-23T12:00:00.000Z" };
  }
  const approvals = (template, document) => (template.countersigns?.(document.fields) ?? []).map((r, index) => ({ id: `stamp-${index}`, slot: r.key ?? r.label, role: r.roles[0], stampedBy: `person-${index}`, decision: r.decisions[0], signerName: "Helena Vorwerk", signerTitle: "Gouverneur", signerSignature: hand, signatureSeed: 44, stampedAt: document.issuedAt }));
  test("appointments retain the exact original wording in the public renderer", () => {
    for (const template of TEMPLATES.filter((t) => t.id.startsWith("ernennung-"))) {
      const document = documentFor(template);
      const input = publicCertificateInput(document, template);
      expect(input.template.blocks(input.document.fields)).toEqual(template.blocks(document.fields));
      expect(template.blocks(document.fields).map((b) => b.kind)).toEqual(["text", "name", "text", "office", "text"]);
    }
  });
  test("leadership includes police while retaining the governor's authority", () => {
    const chief = getTemplate("ernennung-chief");
    expect(chief.group).toBe("Amtsleitungen");
    expect(chief.roles).toEqual(["gouverneur"]);
    expect(getTemplate("ernennung-amtsleiter").group).toBe(chief.group);
    expect(getTemplate("ernennung-gsta").group).toBe(chief.group);
  });
  for (const template of TEMPLATES.filter((t) => isPublicTemplate(t.id))) {
    test(`${template.id}: completed certificate renders as one image`, async () => {
      const document = documentFor(template);
      const image = await renderPublicCertificate(document, template, approvals(template, document));
      expect((await sharp(image).metadata()).height).toBe(1684);
    });
  }
  for (const template of TEMPLATES) {
    test(`${template.id}: private fields cannot affect public pixels`, () => {
      const document = documentFor(template);
      const first = publicCertificateInput(document, template);
      if (!isPublicTemplate(template.id)) return expect(first).toBeNull();
      const other = { ...document, fields: { ...document.fields, grund: "PRIVATE_DISMISSAL_REASON", art: "PRIVATE_CLASSIFICATION", tat: "PRIVATE_CHARGE", objekt: "PRIVATE_ADDRESS", geheim: "<script>SECRET</script>" } };
      expect(publicCertificateInput(other, template).document).toEqual(first.document);
      expect(publicCertificateInput(other, template).template.blocks({})).toEqual(first.template.blocks({}));
      expect(JSON.stringify(first)).not.toContain("PRIVATE_");
      expect(JSON.stringify(first)).not.toContain("<script>");
    });
  }
  test("no preview for pending or rejected appointments", async () => {
    const t = getTemplate("ernennung-staatssekretaer");
    const d = documentFor(t);
    expect(await renderPublicCertificate(d, t, [])).toBeNull();
    const rejected = approvals(t, d); rejected[0].decision = "verweigert";
    expect(await renderPublicCertificate(d, t, rejected)).toBeNull();
  });
  test("produces an actual full-page PNG with a drawn signature", async () => {
    const t = getTemplate("ernennung-staatssekretaer");
    const d = documentFor(t);
    const png = await renderPublicCertificate(d, t, approvals(t, d));
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1191);
    expect(metadata.height).toBe(1684);
    expect(png.byteLength).toBeLessThan(8000000);

  });
});

