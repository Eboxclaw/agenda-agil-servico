import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE_DISPENSADO = "pwa-instalar-dispensado";

export function jaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari não suporta display-mode: standalone de forma fiável
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function eIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(jaInstalada());
  const [dispensado, setDispensado] = useState(true); // começa true até sabermos que deve mostrar

  useEffect(() => {
    try {
      setDispensado(localStorage.getItem(CHAVE_DISPENSADO) === "1");
    } catch {
      setDispensado(false);
    }

    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };
    const instalou = () => {
      setInstalada(true);
      setEvento(null);
    };

    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalou);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalou);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return "indisponivel" as const;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setEvento(null);
    return outcome;
  }, [evento]);

  const dispensar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "1");
    } catch {
      /* ignore */
    }
    setDispensado(true);
  }, []);

  // Mostrar o cartão quando: ainda não instalada, não dispensada e
  // (há evento de instalação disponível OU é iOS, que nunca dispara o evento)
  const mostrarCartao = !instalada && !dispensado && (evento !== null || eIOS());

  return { instalar, dispensar, instalada, mostrarCartao };
}
