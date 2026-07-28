export type Stage = "Prospect" | "Onboarding" | "Live" | "At Risk" | "Churned";

export type Account = {
  id: string;
  name: string;
  type: "Retail" | "Distributor" | "Convenience" | "E-commerce";
  region: string;
  stage: Stage;
  owner: string;
  storeCount: number;
  lastActivity: string;
};

export const accounts: Account[] = [
  { id: "1", name: "Publix", type: "Retail", region: "Southeast", stage: "Onboarding", owner: "Charlie", storeCount: 42, lastActivity: "2026-07-24" },
  { id: "2", name: "Whole Foods", type: "Retail", region: "National", stage: "Live", owner: "Charlie", storeCount: 18, lastActivity: "2026-07-22" },
  { id: "3", name: "ReRock Convenience", type: "Convenience", region: "New Jersey", stage: "Live", owner: "Maya", storeCount: 9, lastActivity: "2026-07-20" },
  { id: "4", name: "GoPuff", type: "Distributor", region: "National", stage: "At Risk", owner: "Maya", storeCount: 60, lastActivity: "2026-07-10" },
  { id: "5", name: "Louisiana Expansion Partners", type: "Distributor", region: "Louisiana", stage: "Prospect", owner: "Charlie", storeCount: 0, lastActivity: "2026-07-15" },
  { id: "6", name: "Utah Ambassador Network", type: "Distributor", region: "Utah", stage: "Onboarding", owner: "Jordan", storeCount: 4, lastActivity: "2026-07-18" },
  { id: "7", name: "Florida Distribution Co.", type: "Distributor", region: "Florida", stage: "Prospect", owner: "Jordan", storeCount: 0, lastActivity: "2026-07-12" },
  { id: "8", name: "Amazon", type: "E-commerce", region: "National", stage: "Live", owner: "Charlie", storeCount: 1, lastActivity: "2026-07-25" },
];

export const stages: Stage[] = ["Prospect", "Onboarding", "Live", "At Risk", "Churned"];

export const stageColor: Record<Stage, string> = {
  Prospect: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  Onboarding: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Live: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "At Risk": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Churned: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};
