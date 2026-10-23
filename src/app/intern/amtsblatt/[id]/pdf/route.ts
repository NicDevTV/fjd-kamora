import type { NextRequest } from "next/server";
import { certificateStamps, countersignItems } from "@/lib/amtsblatt/countersign";
import { renderCertificate } from "@/lib/amtsblatt/pdf";
import { getTemplate } from "@/lib/amtsblatt/templates";
import { getCurrentUser } from "@/lib/server/auth/dal";
import { getStore } from "@/lib/server/db";

// The certificate as a PDF, rendered on demand from the stored record. Only for signed-in
// officials with a role; everyone else gets a bare 401/404 without details.
export async function GET(request: NextRequest, context: RouteContext<"/intern/amtsblatt/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user || user.roles.length === 0) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await context.params;
  const store = await getStore();
  const document = await store.getDocument(id);
  const template = document ? getTemplate(document.template) : null;
  if (!document || !template) return new Response("Nicht gefunden", { status: 404 });

  const stamps = await store.listStamps([document.id]);
  const view = certificateStamps(countersignItems(template, document.fields, stamps));
  const pdf = await renderCertificate(document, template, view.stamps, view.pending);
  const download = request.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
