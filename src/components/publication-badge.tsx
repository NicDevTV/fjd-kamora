import { isPublicTemplate, PUBLICATION_HINT } from "@/lib/amtsblatt/publication";

export function PublicationBadge({ templateId }: { templateId: string }) {
  const published = isPublicTemplate(templateId);
  return (
    <span title={published ? PUBLICATION_HINT.public : PUBLICATION_HINT.internal} className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${published ? "bg-[#2f6f4f]/12 text-[#245a40]" : "bg-navy/8 text-navy"}`}>
      {published ? "Öffentliche Bekanntmachung" : "Vertraulich · nur intern"}
    </span>
  );
}
