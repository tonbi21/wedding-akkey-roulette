"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        void Promise.all(registrations.map((registration) => registration.unregister()));
      });
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is progressive enhancement; the app remains usable without SW.
    });
  }, []);

  return null;
}
