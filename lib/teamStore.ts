"use client";

import { useSyncExternalStore } from "react";
import type { Assignment } from "@/lib/assignments";
import type { ChatMessage } from "@/lib/chat";

/**
 * Where assignments and chat live.
 *
 * IMPORTANT, and the first thing to know about this whole feature: this is the
 * browser's localStorage, which means it is one person's laptop and nothing
 * else. Assigning a door to Rodolfo writes a row that only the browser that
 * wrote it can read. The same goes for every chat message. Until there is a
 * backend, assignments and chat are a working single-player version of a
 * feature that is only worth anything multiplayer, and the UI says so out loud
 * rather than letting someone assume a message was delivered.
 *
 * Everything in the app talks to the TeamStore interface below and nothing
 * reaches for localStorage directly, so swapping this for API routes over a
 * real database is a change to this file plus making the read paths async. That
 * is the whole reason for the indirection.
 */

export type TeamStore = {
  listAssignments(): Assignment[];
  saveAssignments(rows: Assignment[]): void;
  listMessages(): ChatMessage[];
  saveMessages(rows: ChatMessage[]): void;
  /** When this person last opened chat, as an ISO timestamp. */
  getLastRead(email: string): string | null;
  setLastRead(email: string, isoTimestamp: string): void;
};

const ASSIGNMENTS_KEY = "sollos:assignments";
const MESSAGES_KEY = "sollos:chat";
const LAST_READ_PREFIX = "sollos:chat-read:";

/** Same shape as the rest of the app: never let bad stored JSON take a page down. */
function readRaw(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage disabled or full. The in-memory state stays correct for this
    // page view, which is better than throwing halfway through a save.
  }
}

/* -------------------------------------------------------------------------- */
/*  Change notification                                                        */
/* -------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

/**
 * Parsed rows are cached so that getSnapshot returns the same array reference
 * until something actually changes. useSyncExternalStore compares by identity
 * and would loop forever on a fresh array every call.
 */
const cache = new Map<string, unknown>();

function invalidate(): void {
  cache.clear();
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

/** Another tab in this same browser wrote something. Not another person. */
function onStorageEvent(event: StorageEvent): void {
  if (event.key === null || event.key.startsWith("sollos:")) invalidate();
}

function cached<T>(key: string, compute: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = compute();
  cache.set(key, value);
  return value;
}

/* -------------------------------------------------------------------------- */
/*  The localStorage implementation                                            */
/* -------------------------------------------------------------------------- */

function isAssignment(row: unknown): row is Assignment {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.assigneeEmail === "string" &&
    typeof r.createdAt === "string" &&
    typeof r.subject === "object" &&
    r.subject !== null &&
    typeof (r.subject as Record<string, unknown>).id === "string"
  );
}

function isMessage(row: unknown): row is ChatMessage {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.authorEmail === "string" &&
    typeof r.body === "string" &&
    typeof r.createdAt === "string"
  );
}

export const localTeamStore: TeamStore = {
  listAssignments() {
    return cached(ASSIGNMENTS_KEY, () => {
      const rows = readRaw(ASSIGNMENTS_KEY);
      return Array.isArray(rows) ? rows.filter(isAssignment) : [];
    });
  },
  saveAssignments(rows) {
    writeRaw(ASSIGNMENTS_KEY, rows);
    invalidate();
  },
  listMessages() {
    return cached(MESSAGES_KEY, () => {
      const rows = readRaw(MESSAGES_KEY);
      return Array.isArray(rows) ? rows.filter(isMessage) : [];
    });
  },
  saveMessages(rows) {
    writeRaw(MESSAGES_KEY, rows);
    invalidate();
  },
  getLastRead(email) {
    return cached(LAST_READ_PREFIX + email, () => {
      const value = readRaw(LAST_READ_PREFIX + email);
      return typeof value === "string" ? value : null;
    });
  },
  setLastRead(email, isoTimestamp) {
    writeRaw(LAST_READ_PREFIX + email, isoTimestamp);
    invalidate();
  },
};

export const store: TeamStore = localTeamStore;

/* -------------------------------------------------------------------------- */
/*  Writes                                                                     */
/* -------------------------------------------------------------------------- */

/** Unique enough for a single browser, and never two ids from one millisecond. */
export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function addAssignment(assignment: Assignment): void {
  store.saveAssignments([...store.listAssignments(), assignment]);
}

export function updateAssignment(id: string, patch: Partial<Assignment>): void {
  store.saveAssignments(
    store.listAssignments().map((a) => (a.id === id ? { ...a, ...patch } : a))
  );
}

export function removeAssignment(id: string): void {
  store.saveAssignments(store.listAssignments().filter((a) => a.id !== id));
}

export function addMessage(message: ChatMessage): void {
  store.saveMessages([...store.listMessages(), message]);
}

export function removeMessage(id: string): void {
  store.saveMessages(store.listMessages().filter((m) => m.id !== id));
}

export function markChatRead(email: string, at: string): void {
  store.setLastRead(email, at);
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Nothing is read on the server, so the server snapshot is a shared empty array
 * rather than a new one. React compares snapshots by identity, and a fresh
 * array each call is an infinite render.
 */
const NO_ASSIGNMENTS: Assignment[] = [];
const NO_MESSAGES: ChatMessage[] = [];

export function useAssignments(): Assignment[] {
  return useSyncExternalStore(
    subscribe,
    () => store.listAssignments(),
    () => NO_ASSIGNMENTS
  );
}

export function useMessages(): ChatMessage[] {
  return useSyncExternalStore(
    subscribe,
    () => store.listMessages(),
    () => NO_MESSAGES
  );
}

export function useLastRead(email: string | null): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (email ? store.getLastRead(email) : null),
    () => null
  );
}
