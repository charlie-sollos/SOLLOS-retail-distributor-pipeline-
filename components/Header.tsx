import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo/sollos-wordmark.svg" alt="SOLLOS" width={96} height={22} />
        </Link>
        <nav className="flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="hover:text-black dark:hover:text-zinc-50">
            Pipeline
          </Link>
          <Link href="/map" className="hover:text-black dark:hover:text-zinc-50">
            Store Map
          </Link>
        </nav>
      </div>
    </header>
  );
}
