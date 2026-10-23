"use client";

import { useState, type ComponentProps } from "react";
import { IssueStudio } from "./issue-studio";
import type { leadershipChoices } from "@/lib/amtsblatt/leadership";

export function LeadershipStudio({ choices, ...props }: Omit<ComponentProps<typeof IssueStudio>, "templateId" | "titles" | "fixedFields"> & { choices: ReturnType<typeof leadershipChoices> }) {
  const [office, setOffice] = useState(choices[0].office);
  const chosen = choices.find((item) => item.office === office)!;
  return <div className="space-y-6">
    <div className="glass-panel p-6 sm:p-8">
      <label className="block text-sm font-medium" htmlFor="leadership-office">Amtsleitung</label>
      <select id="leadership-office" value={office} onChange={(event) => setOffice(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-white/85 px-4 py-3 text-base">
        {choices.map((item) => <option key={item.office}>{item.office}</option>)}
      </select>
      <p className="mt-3 text-sm leading-relaxed text-muted">{chosen.description}</p>
    </div>
    <IssueStudio key={office} {...props} templateId={chosen.templateId} titles={chosen.titles} fixedFields={chosen.fixedFields} />
  </div>;
}
