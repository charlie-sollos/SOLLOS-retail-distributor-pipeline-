import { SunMark } from "@/components/ui";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-sollos-navy/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-sollos-navy/50 sm:flex-row sm:px-8">
        <p className="flex items-center gap-2">
          <SunMark className="h-3.5 w-3.5" />
          <span className="pixel-face">501105</span>
          SOLLOS © 2026. All rights reserved.
        </p>
        <a
          href="https://sollos.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sollos-navy/70 underline decoration-sollos-navy/25 underline-offset-4 transition-colors hover:text-sollos-navy"
        >
          sollos.com
        </a>
      </div>
    </footer>
  );
}
