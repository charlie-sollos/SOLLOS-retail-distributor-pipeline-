import type { Metadata } from "next";
import { AwaitingReport } from "../AwaitingReport";
import { REPORTS } from "@/lib/reports";

const meta = REPORTS.find((r) => r.key === "distributor-inventory")!;

export const metadata: Metadata = { title: meta.title };

export default function Page() {
  return <AwaitingReport report={meta} />;
}
