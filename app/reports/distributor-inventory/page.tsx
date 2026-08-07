import type { Metadata } from "next";
import Link from "next/link";
import {
  SKUS,
  casesOnHand,
  distributorDataGaps,
  distributorReport,
  hasDamage,
  isRealNote,
  skuMismatches,
  summarizeDistributor,
} from "@/lib/reports";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { Page, PageTitle, SectionHeading, Stat, EmptyState } from "@/components/ui";
import { SubjectAssignments } from "@/components/SubjectAssignments";

export const metadata: Metadata = { title: "Weekly Distributor Inventory Report" };

export default function DistributorInventoryPage() {
  const { entries, placeholder, sourceFile, receivedOn } = distributorReport;
  const summary = summarizeDistributor(entries);
  const gaps = distributorDataGaps(entries);
  const mismatches = skuMismatches(entries);

  return (
    <Page>
      <Link
        href="/reports"
        className="mb-5 inline-block text-sm text-sollos-navy/55 transition-colors hover:text-sollos-navy"
      >
        &larr; Reports
      </Link>

      <PageTitle
        title="Weekly Distributor Inventory Report"
        subtitle={`From ${sourceFile}, received ${receivedOn}.`}
      />

      {placeholder && (
        <div className="card mb-8 border-t-2 border-t-sollos-orange p-5">
          <p className="eyebrow mb-2">Placeholder data</p>
          <p className="text-sm text-sollos-navy/70">
            Every figure on this page comes from the sample row in the spreadsheet, not from a
            real distributor. The layout is real, the numbers are not. Nothing here should be
            quoted until a live report replaces it.
          </p>
        </div>
      )}

      <SubjectAssignments
        subject={{ kind: "report", id: "distributor-inventory" }}
        subjectLabel="Weekly Distributor Inventory Report"
        heading="Who is on this report"
      />

      {entries.length === 0 ? (
        <EmptyState title="No submissions yet">
          Share the week&rsquo;s spreadsheet and it will be read in here.
        </EmptyState>
      ) : (
        <>
          <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Stat
              label="Cases on hand"
              value={summary.casesOnHand}
              unit="cases"
              hint={`Across ${summary.distributors} ${summary.distributors === 1 ? "distributor" : "distributors"}`}
            />
            <Stat
              label="Orders received"
              value={summary.ordersReceived}
              hint="Unit not named on the form"
            />
            <Stat
              label="Orders shipped"
              value={summary.ordersShipped}
              hint="Unit not named on the form"
            />
            <Stat
              label="Damaged"
              value={summary.damagedAmount}
              hint={
                summary.damaged.length === 0
                  ? "None reported"
                  : `Reported by ${summary.damaged.length}`
              }
            />
          </section>

          <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <p className="eyebrow mb-3">Cases on hand by flavour</p>
              <ul className="space-y-2 text-sm">
                {summary.bySku.map((s) => (
                  <li key={s.sku} className="flex items-baseline justify-between gap-4">
                    <span className="text-sollos-navy/70">{s.sku}</span>
                    <span className="num font-semibold text-sollos-navy">{s.cases}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-sollos-navy/45">
                A stock reading taken across distributors. It adds up sideways, never across
                weeks.
              </p>
            </div>

            <div className="card border-t-2 border-t-sollos-orange p-5">
              <p className="eyebrow mb-2">Damage and notes</p>
              {summary.damaged.length === 0 && summary.flagged.length === 0 ? (
                <p className="text-sm text-sollos-navy/55">
                  No damage and nothing flagged this week.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm text-sollos-navy/75">
                  {summary.damaged.map((e) => (
                    <li key={`d_${e.id}`}>
                      <span className="font-medium text-sollos-navy">{e.distributorName}</span>{" "}
                      reported {e.damagedAmount} damaged, with no flavour attached to it.
                    </li>
                  ))}
                  {summary.flagged.map((e) => (
                    <li key={`n_${e.id}`}>
                      <span className="font-medium text-sollos-navy">{e.distributorName}</span>:{" "}
                      {e.notes}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading>Submissions</SectionHeading>
            <Table caption="Every row of the weekly distributor inventory report">
              <Thead>
                <Th>Distributor</Th>
                <Th>Completed by</Th>
                <Th>Date</Th>
                {SKUS.map((sku) => (
                  <Th key={sku} align="right">
                    {sku}
                  </Th>
                ))}
                <Th align="right">Total</Th>
                <Th align="right">Received</Th>
                <Th align="right">Shipped</Th>
                <Th align="right">Damaged</Th>
                <Th>Note</Th>
              </Thead>
              <Tbody>
                {entries.map((e) => (
                  <Tr key={e.id}>
                    <Td strong>{e.distributorName}</Td>
                    <Td muted>{e.completedBy}</Td>
                    <Td muted>{e.dateCompleted ?? "-"}</Td>
                    {SKUS.map((sku) => (
                      <Td key={sku} numeric>
                        {e.casesOnHand[sku] ?? 0}
                      </Td>
                    ))}
                    <Td numeric strong>
                      {casesOnHand(e)}
                    </Td>
                    <Td numeric>{e.ordersReceived}</Td>
                    <Td numeric>{e.ordersShipped}</Td>
                    <Td numeric>
                      {hasDamage(e) ? (
                        <span className="text-sollos-orange">{e.damagedAmount}</span>
                      ) : (
                        0
                      )}
                    </Td>
                    <Td muted>{isRealNote(e.notes) ? e.notes : "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </section>

          {mismatches.length > 0 && (
            <section className="mb-10">
              <SectionHeading>Rows that contradict themselves</SectionHeading>
              <ul className="space-y-1.5 text-sm text-sollos-navy/75">
                {mismatches.map((m, i) => (
                  <li key={`${m.entry.id}_${m.sku}_${i}`} className="card p-4">
                    <span className="font-medium text-sollos-navy">
                      {m.entry.distributorName}
                    </span>{" "}
                    {m.kind === "listed-no-cases"
                      ? `lists ${m.sku} as on hand but reports no cases of it.`
                      : `reports cases of ${m.sku} without listing it as on hand.`}
                  </li>
                ))}
              </ul>
            </section>
          )}
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
            Naming the unit on the two order columns is the cheapest fix and the one that
            changes the most: as it stands, {summary.ordersReceived} received against{" "}
            {summary.ordersShipped} shipped could be a serious backlog or nothing at all.
          </p>
        </section>
      )}
    </Page>
  );
}
