import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lerDefinicoes, listarDias, listarServicosPorIntervalo, type Dia, type Servico } from "@/lib/db";
import {
  descarregar,
  diaSemana,
  duracaoMin,
  formatarData,
  formatarDuracao,
  intervaloPeriodo,
  partilhar,
  resumoTexto,
  servicosParaCSV,
  servicosParaICS,
  totalMinutosServicos,
} from "@/lib/registo";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Registo de Serviços" },
      {
        name: "description",
        content: "Veja horas, serviços e materiais por dia, semana ou mês e exporte para CSV, calendário ou WhatsApp.",
      },
      { property: "og:title", content: "Painel — Registo de Serviços" },
      {
        property: "og:description",
        content: "Totais por dia, semana e mês, com exportação de relatórios.",
      },
    ],
  }),
  component: Painel,
});

type Periodo = "dia" | "semana" | "mes";

function Painel() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [ref, setRef] = useState(() => new Date());
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [dias, setDias] = useState<Dia[]>([]);
  const [trabalhador, setTrabalhador] = useState("");

  const { de, ate } = intervaloPeriodo(periodo, ref);

  const carregar = useCallback(async () => {
    setServicos(await listarServicosPorIntervalo(de, ate));
    setDias((await listarDias()).filter((d) => d.data >= de && d.data <= ate));
    setTrabalhador((await lerDefinicoes()).trabalhador);
  }, [de, ate]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function mover(dir: 1 | -1) {
    const d = new Date(ref);
    if (periodo === "dia") d.setDate(d.getDate() + dir);
    else if (periodo === "semana") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setRef(d);
  }

  const titulo =
    periodo === "dia"
      ? `${diaSemana(de)}, ${formatarData(de)}`
      : `${formatarData(de)} – ${formatarData(ate)}`;

  const clientes = new Set(servicos.map((s) => s.cliente).filter(Boolean));
  const materiais = servicos.flatMap((s) => s.materiais);
  const porDia = new Map<string, Servico[]>();
  for (const s of servicos) porDia.set(s.data, [...(porDia.get(s.data) ?? []), s]);

  const texto = resumoTexto(servicos, dias, `Relatório ${titulo}`, trabalhador);

  return (
    <AppShell titulo="Painel">
      <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dia">Dia</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mês</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => mover(-1)} aria-label="Período anterior">
          <ChevronLeft className="size-5" />
        </Button>
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <Button variant="ghost" size="icon" onClick={() => mover(1)} aria-label="Período seguinte">
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-semibold text-foreground">
            {formatarDuracao(totalMinutosServicos(servicos))}
          </p>
          <p className="text-xs text-muted-foreground">Horas</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-semibold text-foreground">{servicos.length}</p>
          <p className="text-xs text-muted-foreground">Serviços</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-semibold text-foreground">{clientes.size}</p>
          <p className="text-xs text-muted-foreground">Clientes</p>
        </Card>
      </div>

      <div className="mt-4 space-y-4">
        {servicos.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Sem serviços neste período.
          </Card>
        )}
        {[...porDia.keys()].sort().map((data) => {
          const dia = dias.find((d) => d.data === data);
          return (
            <div key={data}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {diaSemana(data)}, {formatarData(data)}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {dia?.entrada ?? "--:--"} → {dia?.saida ?? "--:--"}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {porDia.get(data)!.map((s) => (
                  <Card
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate({ to: "/servico/$id", params: { id: s.id } })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate({ to: "/servico/$id", params: { id: s.id } });
                    }}
                    className="cursor-pointer p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{s.cliente}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {s.morada || s.trabalho}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="text-foreground">
                          {s.inicio}–{s.fim || "…"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatarDuracao(duracaoMin(s.inicio, s.fim))}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {materiais.length > 0 && (
        <Card className="mt-4 p-4">
          <h3 className="font-semibold text-foreground">Materiais do período</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {materiais.map((m) => (
              <li key={m.id}>
                {m.descricao} {m.quantidade}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12" onClick={() => partilhar("Relatório", texto)}>
          <Share2 className="mr-1 size-4" /> Partilhar
        </Button>
        <Button
          variant="outline"
          className="h-12"
          onClick={() =>
            descarregar(`servicos-${de}_${ate}.csv`, servicosParaCSV(servicos, dias), "text/csv")
          }
        >
          <Download className="mr-1 size-4" /> CSV
        </Button>
        <Button
          variant="outline"
          className="h-12"
          onClick={() =>
            descarregar(
              `servicos-${de}_${ate}.json`,
              JSON.stringify({ servicos, dias }, null, 2),
              "application/json",
            )
          }
        >
          <Download className="mr-1 size-4" /> JSON
        </Button>
        <Button
          variant="outline"
          className="h-12"
          onClick={() =>
            descarregar(`servicos-${de}_${ate}.ics`, servicosParaICS(servicos), "text/calendar")
          }
        >
          <CalendarPlus className="mr-1 size-4" /> Calendário
        </Button>
      </div>
    </AppShell>
  );
}
