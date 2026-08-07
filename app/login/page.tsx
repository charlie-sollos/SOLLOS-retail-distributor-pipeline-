import type { Metadata } from "next";
import Image from "next/image";
import { SunMark, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  invalid: "That email and password did not match.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  const message = error ? (MESSAGES[error] ?? MESSAGES.invalid) : null;

  return (
    <div className="flex flex-1 items-center justify-center gap-10 px-6 py-16">
      {/* The product, at the door. Dropped on narrow screens rather than shrunk
          to a thumbnail nobody can read. */}
      <Image
        src="/art/pixel-can.png"
        alt="A can of SOLLOS yerba mate, pineapple and coconut"
        width={239}
        height={712}
        unoptimized
        priority
        className="pixelated hidden h-72 w-auto drop-shadow-[5px_5px_0_rgba(0,42,83,0.18)] lg:block"
      />
      <div className="card relative w-full max-w-sm overflow-hidden p-7">
        <SunMark className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-[0.07]" />
        <div className="relative">
          <h1 className="pixel-face text-xl text-sollos-navy">Sign in</h1>
          <p className="mt-1.5 text-sm text-sollos-navy/60">
            SOLLOS pipeline. Internal tool, team access only.
          </p>

          <form action="/api/auth/login" method="POST" className="mt-6 space-y-3">
            {from && <input type="hidden" name="from" value={from} />}

            <label className="block text-xs font-medium text-sollos-navy/60">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="username"
                autoFocus
                placeholder="you@drinksollos.com"
                className={`mt-1.5 ${inputClass}`}
              />
            </label>

            <label className="block text-xs font-medium text-sollos-navy/60">
              Password
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={`mt-1.5 ${inputClass}`}
              />
            </label>

            <button
              type="submit"
              className="pixel-btn w-full justify-center bg-sollos-navy text-white transition-colors hover:bg-sollos-navy-dark"
            >
              Sign in
            </button>
          </form>

          {message && (
            <p
              role="alert"
              className="mt-4 border-2 border-sollos-orange/40 bg-sollos-orange/8 px-3.5 py-2.5 text-sm text-sollos-navy"
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
