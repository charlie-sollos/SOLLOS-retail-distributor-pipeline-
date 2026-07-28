import { accounts, stages, stageColor } from "@/lib/data";

export default function Home() {
  const totalStores = accounts.reduce((sum, a) => sum + a.storeCount, 0);
  const liveAccounts = accounts.filter((a) => a.stage === "Live").length;
  const atRisk = accounts.filter((a) => a.stage === "At Risk").length;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            SOLLOS Pipeline
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Retail and distributor account tracker
          </p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Accounts" value={accounts.length} />
          <Stat label="Live" value={liveAccounts} />
          <Stat label="At Risk" value={atRisk} />
          <Stat label="Total Stores" value={totalStores} />
        </section>

        <section>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium text-right">Stores</th>
                  <th className="px-4 py-3 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {accounts.map((a) => (
                  <tr key={a.id} className="bg-white dark:bg-black">
                    <td className="px-4 py-3 font-medium text-black dark:text-zinc-50">
                      {a.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.type}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.region}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageColor[a.stage]}`}
                      >
                        {a.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.owner}</td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {a.storeCount}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {a.lastActivity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Stages: {stages.join(" → ")}
          </p>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
    </div>
  );
}
