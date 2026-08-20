import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const tooltipTexto = {
    parada: "Iniciar ditado por voz",
    aouvir: "Parar ditado",
    processando: "A processar\u2026",
    erro: erro ?? "Erro de voz",
  }[estado];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={aOuvir ? "default" : "outline"}
            size="icon"
            className={`shrink-0 ${
              aOuvir ? "animate-pulse bg-green-600 hover:bg-green-700" : ""
            } ${className}`}
            onClick={() => {
              if (aOuvir) parar();
              else alternar();
            }}
          >
            {carregando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : aOuvir ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{aOuvir ? "Toque para parar" : tooltipTexto}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}