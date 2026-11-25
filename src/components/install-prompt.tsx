"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function alreadyInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || nav.standalone === true;
}

export function InstallPrompt({
  installLabel,
  installedLabel,
  unavailableLabel,
}: {
  installLabel: string;
  installedLabel: string;
  unavailableLabel: string;
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (alreadyInstalled()) setInstalled(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p className="note">{installedLabel}</p>;
  if (!prompt) return <p className="hint">{unavailableLabel}</p>;

  return (
    <button
      className="btn no-print"
      type="button"
      onClick={() => {
        const current = prompt;
        setPrompt(null);
        void current.prompt().then(() => current.userChoice).then((choice) => {
          if (choice.outcome === "accepted") setInstalled(true);
        });
      }}
    >
      {installLabel}
    </button>
  );
}
