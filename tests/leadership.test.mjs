import { expect, test } from "bun:test";
import { leadershipChoices } from "../src/lib/amtsblatt/leadership";
import { getTemplate, validateFields } from "../src/lib/amtsblatt/templates";

test("leadership choices follow the issuing authority", () => {
  expect(leadershipChoices(["justizminister"]).map((item) => item.office)).toEqual(["Chief Marshal", "Leiter der Inneren Revision"]);
  expect(leadershipChoices(["gouverneur"]).map((item) => item.office)).toEqual(["Generalstaatsanwalt", "Chief of Police"]);
  expect(leadershipChoices(["staatssekretaer"])).toEqual([]);
  expect(leadershipChoices(["justizminister", "gouverneur"])).toHaveLength(4);
});

test("each shared choice produces valid fields and retains its approvals", () => {
  for (const choice of leadershipChoices(["justizminister", "gouverneur"])) {
    const template = getTemplate(choice.templateId);
    const fields = { ...template.sample, ...choice.fixedFields };
    expect(validateFields(template, fields).error).toBeUndefined();
    const requests = template.countersigns?.(fields) ?? [];
    expect(requests.length).toBe(["Generalstaatsanwalt", "Leiter der Inneren Revision"].includes(choice.office) ? 1 : 0);
    expect(template.blocks(fields).find((block) => block.kind === "office").text).toContain(choice.office);
  }
});
