import { templatesFor, titlesFor } from "./templates";
import type { Role } from "@/lib/server/db/types";

export const LEADERSHIP_IDS = new Set(["ernennung-amtsleiter", "ernennung-chief", "ernennung-gsta"]);

// One user-facing workflow, with the actual issuing authority still checked by
// the existing server action for each selected office's concrete template.
export function leadershipChoices(roles: Role[]) {
  return templatesFor(roles).filter((template) => LEADERSHIP_IDS.has(template.id)).flatMap((template) => {
    const offices = template.id === "ernennung-amtsleiter"
      ? template.fields.find((field) => field.name === "amt")!.options!
      : [template.id === "ernennung-chief" ? "Chief of Police" : "Generalstaatsanwalt"];
    return offices.map((office) => {
      const fixedFields: Record<string, string> = template.id === "ernennung-amtsleiter" ? { amt: office } : {};
      return { office, templateId: template.id, description: template.description, titles: titlesFor(template, roles), fixedFields };
    });
  });
}
