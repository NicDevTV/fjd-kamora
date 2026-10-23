import "server-only";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { certificateStamps, countersignItems, stampStatus } from "@/lib/amtsblatt/countersign";
import { renderCertificate } from "@/lib/amtsblatt/pdf";
import { publicCertificateInput } from "@/lib/amtsblatt/publication";
import type { Template } from "@/lib/amtsblatt/templates";
import type { DocumentRecord, StampRecord } from "@/lib/server/db/types";

// Rasterize the actual certificate instead of maintaining a second Discord layout.
export async function renderPublicCertificate(document: DocumentRecord, template: Template, stamps: StampRecord[]) {
  const input = publicCertificateInput(document, template);
  if (!input || stampStatus(countersignItems(template, document.fields, stamps)) !== "valid") return null;
  const approvals = certificateStamps(countersignItems(template, document.fields, stamps)).stamps;
  const bytes = await renderCertificate(input.document, input.template, approvals);
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages !== 1) throw new Error("Public certificate must fit on one page");
    const page = await pdf.getPage(1);
    // 288 dpi keeps fine print and signature strokes sharp when opened from
    // Discord. Encode directly as lossless PNG without an intermediate resize.
    const viewport = page.getViewport({ scale: 4 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport }).promise;
    return canvas.toBuffer("image/png");
  } finally {
    await task.destroy();
  }
}
