// Offices and ranks of the Föderales Justizdepartement (FJDS 3). Three branches report to the
// Justizminister; every branch has a head, a deputy, working ranks and trainees.
// The Staatssekretär and the Justizminister stand above the branches.

export type Branch = {
  id: "staatsanwaltschaft" | "marshals" | "revision";
  label: string;
  // Highest rank first.
  ranks: string[];
};

export const BRANCHES: Branch[] = [
  {
    id: "staatsanwaltschaft",
    label: "Staatsanwaltschaft",
    ranks: ["Generalstaatsanwalt", "Oberstaatsanwalt", "Staatsanwalt", "Anwärter der Staatsanwaltschaft"],
  },
  {
    id: "marshals",
    label: "Justizmarschalldienst",
    ranks: ["Chief Marshal", "Deputy Chief Marshal", "Marshal", "Deputy Marshal", "Anwärter des Justizmarschalldienstes"],
  },
  {
    id: "revision",
    label: "Innere Revision",
    ranks: ["Leiter der Inneren Revision", "Stellvertretender Leiter der Inneren Revision", "Revisor", "Anwärter der Inneren Revision"],
  },
];

// The Generalstaatsanwalt is appointed by the Gouverneur and confirmed by the Senate (KV 5), so the
// Justizminister never issues that certificate. The heads of the other branches he appoints himself.
export const HEADS_APPOINTED_BY_JM = ["Chief Marshal", "Leiter der Inneren Revision"];

export const STAATSSEKRETAER = "Staatssekretär im Föderalen Justizdepartement";

// Ranks the Justizminister fills with an ordinary appointment: everything below the heads.
export const fjdOffices = BRANCHES.flatMap((branch) => branch.ranks.slice(1).reverse());

// Every rank of the FJD below the Justizminister, for swearing-in and promotion forms.
export const allFjdRanks = [STAATSSEKRETAER, ...BRANCHES.flatMap((branch) => branch.ranks)];

export function branchOf(rank: string) {
  return BRANCHES.find((branch) => branch.ranks.includes(rank)) ?? null;
}

// A promotion stays inside one branch and goes up the ladder by exactly one rank at a time.
export function promotionProblem(from: string | undefined, to: string | undefined) {
  if (!from || !to) return null;
  const branch = branchOf(from);
  if (!branch || branch !== branchOf(to)) return "Eine Beförderung bleibt innerhalb desselben Amtes.";
  const gap = branch.ranks.indexOf(from) - branch.ranks.indexOf(to);
  if (gap < 1) return "Der neue Rang muss höher sein als der bisherige.";
  if (gap > 1) return "Es wird immer nur in den nächsthöheren Rang befördert.";
  if (HEADS_APPOINTED_BY_JM.includes(to) || to === "Generalstaatsanwalt") {
    return "Amtsleiter werden ernannt, nicht befördert (§ 11 FJDS).";
  }
  return null;
}
