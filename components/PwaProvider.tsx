"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// El navegador no tipa este evento de forma estándar todavía.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop" | "other";

interface PwaContextValue {
  /** true si el navegador ha disparado beforeinstallprompt y podemos lanzarlo nosotros. */
  canInstall: boolean;
  /** true si la app ya se está ejecutando instalada (standalone). */
  isStandalone: boolean;
  /** iOS/Safari no dispara beforeinstallprompt: hay que guiar al usuario a mano. */
  platform: Platform;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  isStandalone: false,
  platform: "other",
  promptInstall: async () => {},
});

export function usePwaInstall() {
  return useContext(PwaContext);
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/Mac|Win|Linux/i.test(navigator.platform ?? "")) return "desktop";
  return "other";
}

export default function PwaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = () => {
      const iosStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
      setIsStandalone(standaloneQuery.matches || iosStandalone);
    };
    updateStandalone();
    standaloneQuery.addEventListener("change", updateStandalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      updateStandalone();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: si falla el registro no debe romper la app.
      });
    }

    return () => {
      standaloneQuery.removeEventListener("change", updateStandalone);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // El evento solo se puede usar una vez.
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return (
    <PwaContext.Provider
      value={{
        canInstall: deferredPrompt !== null,
        isStandalone,
        platform,
        promptInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}
