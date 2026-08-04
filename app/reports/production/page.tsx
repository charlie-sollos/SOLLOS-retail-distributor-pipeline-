import type { Metadata } from "next";
import Link from "next/link";
import {
  hasNote,
  latestEntry,
  productionDataGaps,
  productionReport,
  summarizeProduction,
  upcomingSchedule,
} from "@/lib/reports";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { Page, PageTitle, SectionHeading, Stat, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Weekly Production Report" };

/** "8/12" reads faster than a full date in a table of them. */
const short = (iso: string | null) => {
  if (!iso) return "-";
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
};

export default function ProductionReportPage() {
  const { entries, placeholder, sourceFile, receivedOn } = productionReport;
  const summary = summarizeProduction(entries);
  const gaps = productionDataGaps(entries);
  const latest = latestEntry(entries);
  const schedule = upcomingSchedule(entries);

  return (
    <Page>
      <Link
        href="/reports"
        className="mb-5 inline-block text-sm text-sollos-navy/55 transition-colors hover:text-sollos-navy"
      >
        &larr; Reports
      </Link>

      <PageTitle
        title="Weekly Production Report"
        subtitle={`From ${sourceFile}, received ${receivedOn}.`}
      />

      {placeholder && (
        <div className="card mb-8 border-t-2 border-t-sollos-orange p-5">
          <p className="eyebrow mb-2">Placeholder data</p>
          <p className="text-sm text-sollos-navy/70">
            Every figure on this page comes from the sample rows in the spreadsheet, not from
            real production. The layout is real, the numbers are not. Nothing here should be
            quoted until a live report replaces it.
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState title="No submissions yet">
          Share the week&rsquo;s spreadsheet and it will be read in here.
        </EmptyState>
      ) : (
        <>
          <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Stat
              label="Cases produced"
              value={summary.actualCases}
              unit={`of ${summary.plannedCases}`}
              hint={
                summary.attainmentPct !== null
                  ? `${summary.attainmentPct}% of plan`
                  : "Nothing planned"
              }
            />
            <Stat
              label="Cases shipped"
              value={summary.casesShipped}
              hint={`Across ${summary.submissions} submissions`}
            />
            <Stat
              label="Finished goods"
              value={summary.finishedGoodsCases ?? "-"}
              unit="cases"
              hint="Latest reading, not a total"
            />
            <Stat
              label="Line running"
              value={summary.running}
              unit={`of ${summary.submissions}`}
              hint={summary.notRunning > 0 ? `${summary.notRunning} reported stopped` : "All running"}
            />
          </section>

          <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card border-t-2 border-t-sollos-orange p-5">
              <p className="eyebrow mb-2">Under plan</p>
              {summary.underPlan.length === 0 ? (
                <p className="text-sm text-sollos-navy/55">
                  Every submission hit its planned case count.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm text-sollos-navy/75">
                  {summary.underPlan.map((e) => (
                    <li key={e.id}>
                      <span className="font-medium text-sollos-navy">Batch {e.batchNumber}</span>{" "}
                      made {e.actualCases} of {e.plannedCases} cases, short by{" "}
                      {e.plannedCases - e.actualCases}.
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card border-t-2 border-t-sollos-navy/35 p-5">
              <p className="eyebrow mb-2">Flagged a risk or note</p>
              {summary.flagged.length === 0 ? (
                <p className="text-sm text-sollos-navy/55">Nothing flagged this week.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-sollos-navy/75">
                  {summary.flagged.map((e) => (
                    <li key={e.id}>
                      <span className="font-medium text-sollos-navy">{e.completedBy}</span> on batch{" "}
                      {e.batchNumber}: {e.notes}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading>Submissions</SectionHeading>
            <Table caption="Every row of the weekly production report">
              <Thead>
                <Th>Completed by</Th>
                <Th>Status</Th>
                <Th>Batch</Th>
                <Th align="right">Planned</Th>
                <Th align="right">Actual</Th>
                <Th align="right">Finished goods</Th>
                <Th align="right">Shipped</Th>
                <Th>Next run</Th>
                <Th>Next ship</Th>
                <Th>Note</Th>
              </Thead>
              <Tbody>
                {entries.map((e) => (
                  <Tr key={e.id}>
                    <Td strong>{e.completedBy}</Td>
                    <Td>
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          e.status === "Running"
                            ? "bg-sollos-good/12 text-sollos-good"
                            : "bg-sollos-orange/12 text-sollos-orange"
                        }`}
                      >
                        {e.status}
                      </span>
                    </Td>
                    <Td muted>{e.batchNumber}</Td>
                    <Td numeric>{e.plannedCases}</Td>
                    <Td numeric strong>
                      {e.actualCases < e.plannedCases ? (
                        <span className="text-sollos-orange">{e.actualCases}</span>
                      ) : (
                        e.actualCases
                      )}
                    </Td>
                    <Td numeric>{e.finishedGoodsCases}</Td>
                    <Td numeric>{e.casesShippedThisWeek}</Td>
                    <Td muted>{short(e.nextProductionDate)}</Td>
                    <Td muted>{short(e.nextShipmentDate)}</Td>
                    <Td muted>{hasNote(e) ? e.notes : "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </section>

          <section className="mb-10">
            <SectionHeading>What is coming up</SectionHeading>
            <Table caption="Scheduled production and shipment dates">
              <Thead>
                <Th>Date</Th>
                <Th>Event</Th>
                <Th>From</Th>
              </Thead>
              <Tbody>
                {schedule.map((s, i) => (
                  <Tr key={`${s.entry.id}_${s.kind}_${i}`}>
                    <Td strong>{s.date}</Td>
                    <Td>{s.kind}</Td>
                    <Td muted>
                      {s.entry.completedBy}, batch {s.entry.batchNumber}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </section>
        </>
      )}

      {gaps.length > 0 && (
        <section>
          <SectionHeading>What this report cannot answer yet</SectionHeading>
          <ul className="space-y-3">
            {gaps.map((g) => (
              <li key={g.field} className="card p-4">
                <p className="text-sm font-semibold text-sollos-navy">{g.field}</p>
                <p className="mt-1 text-sm text-sollos-navy/60">{g.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-2xl text-xs text-sollos-navy/45">
            All fixable at the source. Adding a week-ending column to the form is the one that
            unlocks the rest, since it turns a pile of submissions into a series.
          </p>
        </section>
      )}

      {latest && (
        <p className="mt-8 max-w-2xl text-xs text-sollos-navy/45">
          Finished goods reads {latest.finishedGoodsCases} cases from{" "}
          {latest.completedBy}&rsquo;s submission, taken as the most recent. With no week column
          and Date Completed mostly blank, that is an assumption about row order rather than a
          confirmed reading. Finished goods is a stock level, so submissions are never added
          together. Cases produced and shipped are flows, so they are.
        </p>
      )}
    </Page>
  );
}
