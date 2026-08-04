import Link from "next/link";
import type { ReportMeta } from "@/lib/reports";
import { Page, PageTitle, EmptyState } from "@/components/ui";

/** Placeholder for a report whose spreadsheet has not been shared yet. */
export function AwaitingReport({ report }: { report: ReportMeta }) {
  return (
    <Page>
      <Link
        href="/reports"
        className="mb-5 inline-block text-sm text-sollos-navy/55 transition-colors hover:text-sollos-navy"
      >
        &larr; Reports
      </Link>
      <PageTitle title={report.title} subtitle={report.purpose} />
      <EmptyState title="Waiting on the spreadsheet">
        Share the week&rsquo;s file and this gets read in the same way the production report
        was: transcribed into the app, with the figures it cannot yet answer called out.
      </EmptyState>
    </Page>
  );
}
