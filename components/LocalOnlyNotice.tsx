/**
 * Said plainly, on both pages that depend on it.
 *
 * The whole point of assigning something is that the other person sees it, and
 * right now they do not: this is the browser's own storage, the same as ops
 * notes and velocity rows. Anyone using it without knowing that would assume
 * work had been handed over when it had not, which is a worse position to be in
 * than not having the feature at all.
 */
export function LocalOnlyNotice() {
  return (
    <div className="card mb-8 border-t-2 border-t-sollos-orange p-5">
      <p className="eyebrow mb-2">This browser only</p>
      <p className="text-sm text-sollos-navy/70">
        Assignments and chat are saved in this browser, the same as ops notes and velocity
        rows. Nothing here reaches anybody else&rsquo;s screen: assigning a door to Rodolfo
        writes a reminder for you, not a message to him. Tell him as well until this sits
        behind a database.
      </p>
    </div>
  );
}
