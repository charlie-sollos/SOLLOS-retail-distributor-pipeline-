import { OverviewClient } from "./OverviewClient";
import { firstNameFromEmail, getSession } from "@/lib/session";

/**
 * A server component purely so the greeting can come from the signed-in
 * session. Everything else on the overview reads browser storage, so it stays
 * in the client component below.
 */
export default async function Home() {
  const session = await getSession();
  return <OverviewClient firstName={firstNameFromEmail(session?.email)} />;
}
