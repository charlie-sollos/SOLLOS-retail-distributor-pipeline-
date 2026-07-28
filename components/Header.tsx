"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Pipeline" },
  { href: "/map", label: "Store Map" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-sollos-cream dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-1.5 sm:px-10">
        <Link href="/" className="flex items-center">
          <Image src="/logo/sollos-wordmark.svg" alt="SOLLOS" width={92} height={21} priority />
        </Link>
        <nav className="flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "font-semibold text-sollos-navy dark:text-sollos-yellow"
                    : "hover:text-sollos-navy dark:hover:text-sollos-yellow"
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
