export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-sollos-cream dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:px-10">
        <p>SOLLOS © 2026. All rights reserved.</p>
        <a
          href="https://sollos.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sollos-navy underline dark:text-sollos-yellow"
        >
          sollos.com
        </a>
      </div>
    </footer>
  );
}
