"use client";

import { useCurrentUser } from "@/components/CurrentUser";
import { useAssignments, useLastRead, useMessages } from "@/lib/teamStore";
import { isOverdue, openAssignedTo, sortForList, type Assignment } from "@/lib/assignments";
import { unreadFor, unreadMentionsFor, type ChatMessage } from "@/lib/chat";

/**
 * What is waiting for the person reading the page.
 *
 * One hook, so the count in the header and the list on the alerts page can
 * never disagree about what counts as an alert. Two things do: work assigned to
 * you and still open, and a message that names you and that you have not read.
 *
 * Unread chat that does not name you deliberately stays out of the count. A
 * badge that lights up for every remark is a badge people stop looking at.
 */
export type Alerts = {
  /** Signed out, on the login screen. Everything below is empty. */
  me: string | null;
  openAssignments: Assignment[];
  overdue: Assignment[];
  unreadMentions: ChatMessage[];
  /** Every unread message, mentions or not. Used for the quieter chat dot. */
  unreadMessages: ChatMessage[];
  /** What the header badge shows. */
  total: number;
};

export function useAlerts(): Alerts {
  const me = useCurrentUser();
  const assignments = useAssignments();
  const messages = useMessages();
  const lastRead = useLastRead(me);

  if (!me) {
    return {
      me: null,
      openAssignments: [],
      overdue: [],
      unreadMentions: [],
      unreadMessages: [],
      total: 0,
    };
  }

  const openAssignments = sortForList(openAssignedTo(assignments, me));
  const unreadMentions = unreadMentionsFor(messages, me, lastRead);

  return {
    me,
    openAssignments,
    overdue: openAssignments.filter((a) => isOverdue(a)),
    unreadMentions,
    unreadMessages: unreadFor(messages, me, lastRead),
    total: openAssignments.length + unreadMentions.length,
  };
}
