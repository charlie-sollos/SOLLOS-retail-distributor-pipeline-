import type { Metadata } from "next";
import Link from "next/link";
import { REPORTS } from "@/lib/reports";
import { Page, PageTitle, SectionHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  const live = REPORTS.filter((r) => r.status === "live");
  const awaiting = REPORTS.filter((r) => r.status === "awaiting");

  return (
    <Page>
      <PageTitle
        title="Reports"
        subtitle="The weekly reports SOLLOS collects, read in by hand once a week."
      />

      <section className="mb-10">
        <SectionHeading>Received</SectionHeading>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {live.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="card block h-full p-5 transition-colors hover:bg-white">
                <p className="font-semibold text-sollos-navy">{r.title}</p>
                <p className="mt-1.5 text-sm text-sollos-navy/60">{r.purpose}</p>
                <span className="mt-3 inline-block text-sm font-medium text-sollos-orange">
                  Open &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {awaiting.length > 0 && (
        <section>
          <SectionHeading>Not received yet</SectionHeading>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {awaiting.map((r) => (
              <li
                key={r.key}
                className="card h-full border border-dashed border-sollos-navy/20 bg-transparent p-5 shadow-none"
              >
                <p className="font-semibold text-sollos-navy/70">{r.title}</p>
                <p className="mt-1.5 text-sm text-sollos-navy/50">{r.purpose}</p>
                <span className="mt-3 inline-block rounded-full bg-sollos-navy/8 px-2.5 py-1 text-xs font-medium text-sollos-navy/55">
                  Waiting on the spreadsheet
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 max-w-2xl text-xs text-sollos-navy/45">
        These are read in manually: hand over the week&rsquo;s spreadsheet and it gets
        transcribed into the app. Nothing here connects to a live file, so a report only
        changes when a new one is shared.
      </p>
    </Page>
  );
}
