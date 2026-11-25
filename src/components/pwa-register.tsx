"use client";

import { useEffect, useState } from "react";

export function PwaRegister({ updateLabel, refreshLabel }: { updateLabel: string; refreshLabel: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let ignore = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller && !ignore) setReady(true);
          });
        };
        watch(registration.installing);
        registration.addEventListener("updatefound", () => watch(registration.installing));
        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          if (!ignore) setReady(true);
        }
      })
      .catch(() => {
        // A failed worker must not block sign-in or a record form.
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (!ready) return null;
  return (
    <div
      className="no-print fixed inset-x-0 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-card bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4"
      role="status"
    >
      <p>{updateLabel}</p>
      <button className="btn" type="button" onClick={() => window.location.reload()}>
        {refreshLabel}
      </button>
    </div>
  );
}
