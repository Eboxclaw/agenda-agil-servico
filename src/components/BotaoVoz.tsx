import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoz } from "@/hooks/useVoz";

type Props = {
  /** Chamado com cada resultado parcial/final da transcrição */
  aoResultado: (texto: string) => void;
  /** Idioma (default pt-PT) */
  idioma?: string;
  /** Modo contínuo (default true) */
  continua?: boolean;
  className?: string;
};

export function BotaoVoz({
  aoResultado,
  idioma = "pt-PT",
  continua = true,
  className = "",
}: Props) {
  const { estado, erro, suportado, alternar, parar } = useVoz({
    idioma,
    continua,
    aoResultadoParcial: aoResultado,
  });

  if (!suportado) return null;

  const aOuvir = estado === "aouvir";
  const carregando = estado === "processando";

  const titulo = {
    parada: "Ditar por voz",
    aouvir: "Toque para parar",
    processando: "A processar\u2026",
    erro: erro ?? "Erro de voz",
  }[estado];

  return (
    <Button
      type="button"
      variant={aOuvir ? "default" : "outline"}
      size="icon"
      title={titulo}
      aria-label={titulo}
      className={`size-11 shrink-0 rounded-xl ${aOuvir ? "animate-pulse" : ""} ${className}`}
      onClick={() => (aOuvir ? parar() : alternar())}
    >
      {carregando ? (
        <Loader2 className="size-4 animate-spin" />
      ) : aOuvir ? (
        <MicOff className="size-4" />
      ) : (
        <Mic className="size-4" />
      )}
    </Button>
  );
}
