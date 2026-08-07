"use client";

import { useCurrentUser } from "@/components/CurrentUser";
import { parseMessage } from "@/lib/chat";

/**
 * A message body with the mentions picked out.
 *
 * A mention of you is filled in solid and one of somebody else is only tinted,
 * so scanning a long room for your own name takes a glance rather than a read.
 */
export function MessageBody({ body }: { body: string }) {
  const me = useCurrentUser();

  return (
    <p className="whitespace-pre-wrap break-words text-sm text-sollos-navy">
      {parseMessage(body).map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <span
            key={i}
            className={`pixel-face px-1 py-0.5 text-[11px] ${
              segment.person.email === me
                ? "bg-sollos-orange text-white"
                : "bg-sollos-navy/10 text-sollos-navy"
            }`}
          >
            {segment.text}
          </span>
        )
      )}
    </p>
  );
}
