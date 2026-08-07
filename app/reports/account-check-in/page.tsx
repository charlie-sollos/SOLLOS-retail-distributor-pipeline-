import type { Metadata } from "next";
import Link from "next/link";
import {
  checkInDataGaps,
  checkInReport,
  isRealNote,
  matchedDoorId,
  summarizeCheckIn,
  upcomingReorders,
} from "@/lib/reports";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { Page, PageTitle, SectionHeading, Stat, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Weekly Account Check-In" };

/** "8/19" reads faster than a full date in a table of them. */
const short = (iso: string | null) => {
  if (!iso) return "-";
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
};

const riskClass = (risk: string) =>
  risk === "High"
    ? "bg-sollos-orange/12 text-sollos-orange"
    : risk === "Medium"
      ? "bg-sollos-navy/10 text-sollos-navy/70"
      : "bg-sollos-good/12 text-sollos-good";

export default function AccountCheckInPage() {
  const { entries, placeholder, sourceFile, receivedOn } = checkInReport;
  const summary = summarizeCheckIn(entries);
  const gaps = checkInDataGaps(entries);
  const reorders = upcomingReorders(entries);

  return (
    <Page>
      <Link
        href="/reports"
        className="mb-5 inline-block text-sm text-sollos-navy/55 transition-colors hover:text-sollos-navy"
      >
        &larr; Reports
      </Link>

      <PageTitle
        title="Weekly Account Check-In"
        subtitle={`From ${sourceFile}, received ${receivedOn}.`}
      />

      {placeholder && (
        <div className="card mb-8 border-t-2 border-t-sollos-orange p-5">
          <p className="eyebrow mb-2">Placeholder data</p>
          <p className="text-sm text-sollos-navy/70">
            Every figure on this page comes from the sample rows in the spreadsheet, not from
            real check-ins. The layout is real, the numbers are not. Nothing here should be
            quoted until a live report replaces it.
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState title="No check-ins yet">
          Share the week&rsquo;s spreadsheet and it will be read in here.
        </EmptyState>
      ) : (
        <>
          <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Stat
              label="Check-ins"
              value={summary.checkIns}
              hint={`${summary.accounts} accounts, ${summary.managers} managers`}
            />
            <Stat
              label="Cases at the doors"
              value={summary.casesOnHand}
              unit="cases"
              hint="Stock reading, not a total sold"
            />
            <Stat
              label="Expected reorder"
              value={summary.expectedReorderCases}
              unit="cases"
              hint="Forecast by the field, not an order"
            />
            <Stat
              label="At risk of stockout"
              value={summary.atRisk.length}
              unit={`of ${summary.checkIns}`}
              hint={summary.atRisk.length === 0 ? "None rated above Low" : "Rated High or Medium"}
            />
          </section>

          <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card border-t-2 border-t-sollos-orange p-5">
              <p className="eyebrow mb-2">Stockout risk flagged</p>
              {summary.atRisk.length === 0 ? (
                <p className="text-sm text-sollos-navy/55">
                  Every check-in came back Low.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm text-sollos-navy/75">
                  {summary.atRisk.map((e) => (
                    <li key={e.id}>
                      <span className="font-medium text-sollos-navy">{e.accountName}</span> rated{" "}
                      {e.stockoutRisk} on {e.currentCases} cases of {e.sku}.
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card border-t-2 border-t-sollos-navy/35 p-5">
              <p className="eyebrow mb-2">Promotion coming</p>
              {summary.promos.length === 0 ? (
                <p className="text-sm text-sollos-navy/55">Nothing planned at any door.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-sollos-navy/75">
                  {summary.promos.map((e) => (
                    <li key={e.id}>
                      <span className="font-medium text-sollos-navy">{e.accountName}</span>, per{" "}
                      {e.accountManager}. Worth checking the door has cover for it.
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mb-10">
            <SectionHeading>Check-ins</SectionHeading>
            <Table caption="Every row of the weekly account check-in">
              <Thead>
                <Th>Account</Th>
                <Th>Manager</Th>
                <Th>SKU</Th>
                <Th align="right">Cases on hand</Th>
                <Th>Reorder due</Th>
                <Th align="right">Reorder qty</Th>
                <Th>Risk</Th>
                <Th>Promo</Th>
                <Th>Note</Th>
              </Thead>
              <Tbody>
                {entries.map((e) => (
                  <Tr key={e.id}>
                    <Td strong>
                      {e.accountName}
                      {matchedDoorId(e.accountName) === null && (
                        <span className="ml-2 bg-sollos-navy/8 badge text-sollos-navy/55">
                          no matching door
                        </span>
                      )}
                    </Td>
                    <Td muted>{e.accountManager}</Td>
                    <Td muted>{e.sku}</Td>
                    <Td numeric strong>
                      {e.currentCases}
                    </Td>
                    <Td muted>{short(e.expectedReorderDate)}</Td>
                    <Td numeric>{e.expectedReorderCases}</Td>
                    <Td>
                      <span
                        className={`badge ${riskClass(e.stockoutRisk)}`}
                      >
                        {e.stockoutRisk}
                      </span>
                    </Td>
                    <Td muted>{e.promoComing}</Td>
                    <Td muted>{isRealNote(e.notes) ? e.notes : "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </section>

          <section className="mb-10">
            <SectionHeading>Reorders the field expects</SectionHeading>
            <Table caption="Expected reorder dates and quantities, soonest first">
              <Thead>
                <Th>Date</Th>
                <Th>Account</Th>
                <Th align="right">Cases</Th>
                <Th>From</Th>
              </Thead>
              <Tbody>
                {reorders.map((e) => (
                  <Tr key={e.id}>
                    <Td strong>{e.expectedReorderDate ?? "Not given"}</Td>
                    <Td>{e.accountName}</Td>
                    <Td numeric>{e.expectedReorderCases}</Td>
                    <Td muted>{e.accountManager}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <p className="mt-3 max-w-2xl text-xs text-sollos-navy/45">
              These are the field&rsquo;s expectations, not placed orders. Nothing here reserves
              stock or appears in the warehouse counts.
            </p>
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
            The account name is the one to fix first. A check-in that ties to a door can be put
            next to that door&rsquo;s shipments and sell-through, which is where the check-in
            stops being a note and starts being a signal.
          </p>
        </section>
      )}
    </Page>
  );
}
