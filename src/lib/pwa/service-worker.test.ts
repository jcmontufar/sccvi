import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { beforeEach, describe, expect, it, vi } from "vitest";

type ServiceWorkerListener = (event: unknown) => void;

function createServiceWorkerHarness() {
  const listeners = new Map<string, ServiceWorkerListener>();
  const cacheAddAll = vi.fn(async (urls: string[]) => void urls);
  const cacheMatch = vi.fn(async (request: string) => {
    void request;
    return undefined as Response | undefined;
  });
  const cacheDelete = vi.fn(async (cacheName: string) => {
    void cacheName;
    return true;
  });
  const cacheKeys = vi.fn(async () => [] as string[]);
  const fetchRequest = vi.fn(async (request: unknown) => {
    void request;
    return new Response("online");
  });
  const claimClients = vi.fn(async () => undefined);
  const skipWaiting = vi.fn(async () => undefined);

  const workerScope = {
    location: { origin: "https://sccvi.example" },
    clients: { claim: claimClients },
    skipWaiting,
    addEventListener(type: string, listener: ServiceWorkerListener) {
      listeners.set(type, listener);
    },
  };

  const cacheStorage = {
    open: vi.fn(async (cacheName: string) => {
      void cacheName;
      return { addAll: cacheAddAll };
    }),
    keys: cacheKeys,
    delete: cacheDelete,
    match: cacheMatch,
  };

  runInNewContext(
    readFileSync(resolve("public/sw.js"), "utf8"),
    {
      self: workerScope,
      caches: cacheStorage,
      fetch: fetchRequest,
      URL,
      Response,
      Promise,
    },
    { filename: "public/sw.js" },
  );

  function dispatchLifecycle(type: "install" | "activate") {
    let completion: Promise<unknown> | undefined;
    listeners.get(type)?.({
      waitUntil(promise: Promise<unknown>) {
        completion = promise;
      },
    });
    return completion;
  }

  function dispatchFetch(request: {
    method: string;
    mode: string;
    url: string;
  }) {
    let response: Promise<Response> | undefined;
    listeners.get("fetch")?.({
      request,
      respondWith(responsePromise: Promise<Response>) {
        response = responsePromise;
      },
    });
    return response;
  }

  return {
    cacheAddAll,
    cacheDelete,
    cacheKeys,
    cacheMatch,
    claimClients,
    dispatchFetch,
    dispatchLifecycle,
    fetchRequest,
    skipWaiting,
  };
}

describe("SCCVI service worker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("precaches only the self-contained offline page", async () => {
    const harness = createServiceWorkerHarness();

    await harness.dispatchLifecycle("install");

    expect(harness.cacheAddAll).toHaveBeenCalledExactlyOnceWith([
      "/offline.html",
    ]);
    expect(harness.skipWaiting).toHaveBeenCalledOnce();
  });

  it("does not intercept mutations, APIs, or RSC-style GET requests", () => {
    const harness = createServiceWorkerHarness();

    expect(
      harness.dispatchFetch({
        method: "POST",
        mode: "navigate",
        url: "https://sccvi.example/app/ninos",
      }),
    ).toBeUndefined();
    expect(
      harness.dispatchFetch({
        method: "GET",
        mode: "navigate",
        url: "https://sccvi.example/api/v1/reports/pdf",
      }),
    ).toBeUndefined();
    expect(
      harness.dispatchFetch({
        method: "GET",
        mode: "cors",
        url: "https://sccvi.example/app?_rsc=example",
      }),
    ).toBeUndefined();
    expect(harness.fetchRequest).not.toHaveBeenCalled();
    expect(harness.cacheMatch).not.toHaveBeenCalled();
  });

  it("returns the offline page only when a navigation network request fails", async () => {
    const harness = createServiceWorkerHarness();
    const offlineResponse = new Response("Sin conexión");
    harness.fetchRequest.mockRejectedValueOnce(new TypeError("offline"));
    harness.cacheMatch.mockResolvedValueOnce(offlineResponse);

    const response = harness.dispatchFetch({
      method: "GET",
      mode: "navigate",
      url: "https://sccvi.example/app",
    });

    await expect(response).resolves.toBe(offlineResponse);
    expect(harness.cacheMatch).toHaveBeenCalledExactlyOnceWith(
      "/offline.html",
      { cacheName: "sccvi-offline-v1" },
    );
  });

  it("returns server errors unchanged instead of masking them as offline", async () => {
    const harness = createServiceWorkerHarness();
    const serverError = new Response("error", { status: 500 });
    harness.fetchRequest.mockResolvedValueOnce(serverError);

    const response = harness.dispatchFetch({
      method: "GET",
      mode: "navigate",
      url: "https://sccvi.example/app",
    });

    await expect(response).resolves.toBe(serverError);
    expect(harness.cacheMatch).not.toHaveBeenCalled();
  });

  it("deletes only obsolete SCCVI offline caches", async () => {
    const harness = createServiceWorkerHarness();
    harness.cacheKeys.mockResolvedValueOnce([
      "sccvi-offline-v0",
      "sccvi-offline-v1",
      "unrelated-cache",
    ]);

    await harness.dispatchLifecycle("activate");

    expect(harness.cacheDelete).toHaveBeenCalledExactlyOnceWith(
      "sccvi-offline-v0",
    );
    expect(harness.claimClients).toHaveBeenCalledOnce();
  });
});
