export type DocumentEntry = {
  id: string;
  number: string;
  templateId: string;
  title: string;
  subject: string;
  group: string;
  signer: string;
  issued: string;
  public: boolean;
  status: "valid" | "pending" | "void";
  progress: string | null;
};

const fold = (value: string) => value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/ß/g, "ss");

export function filterDocuments(entries: DocumentEntry[], filters: { query: string; group: string; visibility: string; status: string }) {
  const terms = fold(filters.query).split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (filters.group && entry.group !== filters.group) return false;
    if (filters.visibility && entry.public !== (filters.visibility === "public")) return false;
    if (filters.status && entry.status !== filters.status) return false;
    const searchable = fold([entry.number, entry.title, entry.subject, entry.group, entry.signer].join(" "));
    return terms.every((term) => searchable.includes(term));
  });
}
