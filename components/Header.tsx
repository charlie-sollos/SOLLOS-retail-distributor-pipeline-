"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelAvatar } from "@/components/PixelAvatar";
import { useCurrentUser } from "@/components/CurrentUser";
import { useAlerts } from "@/lib/useAlerts";
import { displayName } from "@/lib/people";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/map", label: "Map" },
  { href: "/inventory", label: "Inventory" },
  { href: "/reports", label: "Reports" },
  { href: "/pricing", label: "Pricing" },
  { href: "/chat", label: "Chat" },
];

export function Header() {
  const pathname = usePathname();
  // No nav on the sign-in screen: every link there would bounce straight back.
  const signedOut = pathname === "/login";

  return (
    <header className="sticky top-0 z-50 border-b border-sollos-navy/10 bg-sollos-cream/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-3 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="501105 home">
          <Image
            src="/logo/sollos-wordmark.svg"
            alt="SOLLOS"
            width={112}
            height={20}
            priority
          />
          {/* The ERP's own name, kept beside the brand rather than replacing it. */}
          <span className="pixel-face hidden border-l-2 border-sollos-navy/15 pl-2.5 text-xs text-sollos-navy/70 sm:inline">
            501105
          </span>
        </Link>

        {signedOut ? null : (
          <div className="flex min-w-0 items-center gap-2">
            {/* Seven tabs no longer fit a narrow window, so the nav scrolls
                sideways rather than clipping the last one off the edge. The
                alerts count sits outside it, because a badge you have to
                scroll to find is not a badge. */}
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
                              nav.scrollLeft =
                                el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
                            }
                          }
                        : undefined
                    }
                    className={
                      active
                        ? "pixel-face shrink-0 whitespace-nowrap border-2 border-sollos-navy bg-sollos-navy px-2.5 py-1.5 text-[10px] text-white"
                        : "pixel-face shrink-0 whitespace-nowrap border-2 border-transparent px-2.5 py-1.5 text-[10px] text-sollos-navy/65 transition-colors hover:border-sollos-navy/25 hover:text-sollos-navy"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <AlertsButton active={pathname.startsWith("/alerts")} />
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Your own face, the count of what is waiting, and the way to your account.
 *
 * Renders zero as a quiet outline rather than disappearing, so the way to your
 * alerts is always in the same place. Signing out lives on the other end of
 * this button rather than in the nav: it is a once-a-month action that was
 * sitting next to seven things people press all day.
 */
function AlertsButton({ active }: { active: boolean }) {
  const me = useCurrentUser();
  const { total, overdue } = useAlerts();

  const tone = active
    ? "border-sollos-navy bg-sollos-navy text-white"
    : total > 0
      ? "border-sollos-orange bg-sollos-orange text-white"
      : "border-sollos-navy/20 bg-white text-sollos-navy/55 hover:border-sollos-navy/45";

  const label =
    (total === 0
      ? "Your alerts, nothing waiting"
      : `Your alerts, ${total} waiting${overdue.length > 0 ? `, ${overdue.length} overdue` : ""}`) +
    (me ? `. Signed in as ${displayName(me)}` : "");

  return (
    <Link
      href="/alerts"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 border-2 px-1.5 py-1 transition-colors ${tone}`}
    >
      {me && <PixelAvatar email={me} size={20} />}
      <span className="pixel-face text-[10px] leading-none">{total > 0 ? total : "-"}</span>
    </Link>
  );
}
