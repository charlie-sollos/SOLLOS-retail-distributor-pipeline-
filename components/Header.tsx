"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/map", label: "Map" },
  { href: "/inventory", label: "Inventory" },
  { href: "/pricing", label: "Pricing" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-sollos-navy/10 bg-sollos-cream/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="SOLLOS home">
          <Image
            src="/logo/sollos-wordmark.svg"
            alt="SOLLOS"
            width={112}
            height={20}
            priority
          />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => {
            // Store pages live under the pipeline conceptually, so keep that tab lit.
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`) ||
                  (link.href === "/pipeline" && pathname.startsWith("/stores"));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-sollos-navy px-3 py-1.5 font-semibold text-white"
                    : "rounded-full px-3 py-1.5 font-medium text-sollos-navy/65 transition-colors hover:bg-sollos-navy/6 hover:text-sollos-navy"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
