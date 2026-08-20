import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlarmClock, Clock, LogIn, LogOut, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BannerInstalarPWA } from "@/components/BannerInstalarPWA";
import { iniciarAlarmes } from "@/lib/alarmes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  guardarDia,
  lerDefinicoes,
  lerDia,
  listarServicosPorIntervalo,
  type Dia,
  type Servico,
} from "@/lib/db";
import {
  diaSemana,
  formatarData,
  formatarDuracao,
  hojeISO,
  horaAgora,
  duracaoMin,
  minutos,
  totalMinutosServicos,
} from "@/lib/registo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoje — Registo de Serviços" },
      {
        name: "description",
        content: "Registe entrada, saída e os serviços feitos hoje: cliente, morada, trabalho, materiais e fotos.",
      },
      { property: "og:title", content: "Hoje — Registo de Serviços" },
      {
        property: "og:description",
        content: "Registe entrada, saída e os serviços feitos hoje, com fotos e materiais.",
      },
    ],
  }),
  component: Hoje,
});

function Hoje() {
  const navigate = useNavigate();
  const data = hojeISO();
  const [dia, setDia] = useState<Dia>({ data, entrada: null, saida: null });
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [entradaAlvo, setEntradaAlvo] = useState("07:30");
  const [pronto, setPronto] = useState(false);

  const carregar = useCallback(async () => {
    setDia(await lerDia(data));
    setServicos(await listarServicosPorIntervalo(data, data));
    setEntradaAlvo((await lerDefinicoes()).entradaAlvo);
    setPronto(true);
  }, [data]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    return iniciarAlarmes((a, perdido) => {
      if (perdido) toast.warning(`Alarme perdido: ${a.titulo}`, { description: `Estava marcado para as ${a.hora}.` });
      else toast(a.titulo, { description: a.corpo, duration: 20000 });
    });
  }, []);

  async function marcar(campo: "entrada" | "saida") {
    const novo = { ...dia, [campo]: horaAgora() };
    setDia(novo);
    await guardarDia(novo);
  }

  const totalDia =
    dia.entrada && dia.saida
      ? duracaoMin(dia.entrada, dia.saida)
      : totalMinutosServicos(servicos);

  const desvio = dia.entrada ? minutos(dia.entrada) - minutos(entradaAlvo) : null;


  return (
    <AppShell titulo="Hoje">
      <p className="text-sm text-muted-foreground">
        {diaSemana(data)}, {formatarData(data)}
      </p>

      <BannerInstalarPWA />

      <Card className="mt-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Horário do dia</p>
            <p className="text-2xl font-semibold text-foreground">
              {dia.entrada ?? "--:--"} → {dia.saida ?? "--:--"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="size-4" /> {formatarDuracao(totalDia)} registados
            </p>
          </div>
        </div>
        {desvio !== null && (
          <p className="mt-2 flex items-center gap-1 text-sm">
            <AlarmClock className="size-4 text-muted-foreground" />
            <span className={desvio > 0 ? "text-destructive" : "text-muted-foreground"}>
              {desvio === 0
                ? `Entrada à hora prevista (${entradaAlvo})`
                : desvio > 0
                  ? `${desvio} min depois das ${entradaAlvo}`
                  : `${Math.abs(desvio)} min antes das ${entradaAlvo}`}
            </span>
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button size="lg" className="h-14 text-base" onClick={() => marcar("entrada")}>
            <LogIn className="mr-1 size-5" /> Entrada
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-14 text-base"
            onClick={() => marcar("saida")}
          >
            <LogOut className="mr-1 size-5" /> Saída
          </Button>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Serviços de hoje</h2>
        <span className="text-sm text-muted-foreground">{servicos.length}</span>
      </div>

      <div className="mt-2 space-y-3">
        {pronto && servicos.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Ainda não registou serviços hoje.
          </Card>
        )}
        {servicos.map((s) => (
          <Card
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate({ to: "/servico/$id", params: { id: s.id } })}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ to: "/servico/$id", params: { id: s.id } });
            }}
            className="cursor-pointer p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{s.cliente || "Sem cliente"}</p>
                {s.morada && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" /> {s.morada}
                  </p>
                )}
                {s.trabalho && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.trabalho}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-foreground">
                  {s.inicio}–{s.fim || "…"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatarDuracao(duracaoMin(s.inicio, s.fim))}
                </p>
                {s.fotoIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{s.fotoIds.length} foto(s)</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        size="lg"
        className="mt-6 h-14 w-full text-base"
        onClick={() => navigate({ to: "/servico/$id", params: { id: "novo" } })}
      >
        <Plus className="mr-1 size-5" /> Novo serviço
      </Button>
    </AppShell>
  );
}
