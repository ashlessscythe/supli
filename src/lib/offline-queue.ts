"use client";

import { OFFLINE_QUEUE_KEY } from "@/lib/pwa/constants";

export type OfflineMutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface OfflineMutation {
  id: string;
  url: string;
  method: OfflineMutationMethod;
  body?: string;
  headers?: Record<string, string>;
  createdAt: number;
  label?: string;
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function readQueue(): OfflineMutation[] {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function getOfflineQueue(): OfflineMutation[] {
  return readQueue();
}

export function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, "id" | "createdAt"> & { id?: string }
): OfflineMutation {
  const entry: OfflineMutation = {
    id: mutation.id ?? crypto.randomUUID(),
    url: mutation.url,
    method: mutation.method,
    body: mutation.body,
    headers: mutation.headers,
    label: mutation.label,
    createdAt: Date.now(),
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function removeOfflineMutation(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export async function flushOfflineQueue(): Promise<{
  flushed: number;
  remaining: number;
}> {
  const online =
    typeof navigator === "undefined" ? false : Boolean(navigator.onLine);
  if (!online) {
    return { flushed: 0, remaining: readQueue().length };
  }

  const queue = readQueue();
  let flushed = 0;
  const remaining: OfflineMutation[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...(item.headers ?? {}),
        },
        body: item.body,
      });
      if (res.ok) {
        flushed += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
