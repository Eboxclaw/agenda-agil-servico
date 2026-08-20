import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInstallPrompt, eIOS } from "@/hooks/useInstallPrompt";

export function BannerInstalarPWA() {
  const { instalar, dispensar, mostrarCartao } = useInstallPrompt();

  if (!mostrarCartao) return null;

  if (eIOS()) {
    return (
      <Card className="relative mb-4 p-4 text-sm">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-6"
          onClick={dispensar}
        >
          <X className="size-4" />
        </Button>
        <p className="font-medium text-foreground">Instalar Solar Agraço</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
          <li>Toque em <strong>Partilhar</strong> (<span className="text-xs">⬆️</span>) na barra do Safari</li>
          <li>Deslize para baixo e toque em <strong>Adicionar ao Ecrã Principal</strong></li>
          <li>Toque em <strong>Adicionar</strong></li>
        </ol>
      </Card>
    );
  }

  return (
    <Card className="relative mb-4 flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-medium text-foreground">Instalar Solar Agraço</p>
        <p className="text-sm text-muted-foreground">Adicione ao ecrã principal para usar como app.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={() => void instalar()}>
          Instalar
        </Button>
        <Button size="sm" variant="ghost" onClick={dispensar}>
          <X className="size-4" />
        </Button>
      </div>
    </Card>
  );
}