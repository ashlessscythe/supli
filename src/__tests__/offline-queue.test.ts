import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOfflineMutation,
  flushOfflineQueue,
  getOfflineQueue,
  removeOfflineMutation,
} from "@/lib/offline-queue";
import { OFFLINE_QUEUE_KEY } from "@/lib/pwa/constants";

describe("offline mutation queue", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "crypto",
      {
        randomUUID: () => "test-id",
      } as Crypto
    );
  });

  it("enqueues and removes mutations", () => {
    enqueueOfflineMutation({
      url: "/api/kiosk/consume",
      method: "POST",
      body: JSON.stringify({ barcode: "ABC", quantity: 1 }),
    });
    expect(getOfflineQueue()).toHaveLength(1);
    expect(localStorage.getItem(OFFLINE_QUEUE_KEY)).toContain("ABC");
    removeOfflineMutation("test-id");
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("flushes successful mutations when online", async () => {
    enqueueOfflineMutation({
      url: "/api/kiosk/consume",
      method: "POST",
      body: "{}",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true })
    );
    const result = await flushOfflineQueue();
    expect(result.flushed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("keeps failed mutations in the queue", async () => {
    enqueueOfflineMutation({
      url: "/api/kiosk/consume",
      method: "POST",
      body: "{}",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false })
    );
    const result = await flushOfflineQueue();
    expect(result.flushed).toBe(0);
    expect(result.remaining).toBe(1);
  });
});
