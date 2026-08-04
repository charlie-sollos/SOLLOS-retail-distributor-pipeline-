"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/map", label: "Map" },
  { href: "/inventory", label: "Inventory" },
  { href: "/reports", label: "Reports" },
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
        {/* Six tabs no longer fit a narrow window, so the nav scrolls sideways
            rather than clipping the last one off the edge. */}
        <nav
          aria-label="Main"
          className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
                // On a narrow screen the active tab can sit off the edge of the
                // scrolling nav, so there is no way to tell where you are. Pull it
                // into view, but only when it is actually hidden, so this never
                // fights someone scrolling the nav by hand.
                ref={
                  active
                    ? (el) => {
                        const nav = el?.parentElement;
                        if (!el || !nav) return;
                        const right = el.offsetLeft + el.offsetWidth;
                        const hidden =
                          el.offsetLeft < nav.scrollLeft ||
                          right > nav.scrollLeft + nav.clientWidth;
                        if (hidden) {
                          nav.scrollLeft = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
                        }
                      }
                    : undefined
                }
                className={
                  active
                    ? "shrink-0 whitespace-nowrap rounded-full bg-sollos-navy px-3 py-1.5 font-semibold text-white"
                    : "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-medium text-sollos-navy/65 transition-colors hover:bg-sollos-navy/6 hover:text-sollos-navy"
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
