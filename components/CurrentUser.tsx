"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Who is signed in, available to client components.
 *
 * The session cookie is httpOnly, so the browser cannot read it and this has to
 * come down from the server. The root layout verifies the cookie and passes the
 * address in here, which means every client component that needs to know whose
 * alerts to count or whose name to sign a message with can just ask.
 *
 * Null on the sign-in page, and only there.
 */
const CurrentUserContext = createContext<string | null>(null);

export function CurrentUserProvider({
  email,
  children,
}: {
  email: string | null;
  children: ReactNode;
}) {
  return <CurrentUserContext.Provider value={email}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): string | null {
  return useContext(CurrentUserContext);
}
