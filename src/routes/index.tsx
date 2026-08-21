import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BannerInstalarPWA } from "@/components/BannerInstalarPWA";
import { CalendarioMes } from "@/components/CalendarioMes";
import { iniciarAlarmes } from "@/lib/alarmes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  guardarDia,
  lerDefinicoes,
  lerDia,
  listarServicos,
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
      { title: "Hoje — Solar Agraço Serviços" },
      {
        name: "description",
        content:
          "Registe entrada, saída e os serviços do dia: cliente, morada, trabalho, materiais e fotos.",
      },
      { property: "og:title", content: "Hoje — Solar Agraço Serviços" },
      {
        property: "og:description",
        content: "Registe entrada, saída e os serviços do dia, com fotos e materiais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Hoje,
});

function Hoje() {
  const navigate = useNavigate();
  const hoje = hojeISO();
  const [data, setData] = useState(hoje);
  const [dia, setDia] = useState<Dia>({ data: hoje, entrada: null, saida: null });
  const [todos, setTodos] = useState<Servico[]>([]);
  const [entradaAlvo, setEntradaAlvo] = useState("07:30");
  const [pronto, setPronto] = useState(false);
  const [mesAberto, setMesAberto] = useState(false);
  const [editarAberto, setEditarAberto] = useState(false);
  const [rascunho, setRascunho] = useState({ entrada: "", saida: "" });

  const carregar = useCallback(async () => {
    setDia(await lerDia(data));
    setTodos(await listarServicos());
    setEntradaAlvo((await lerDefinicoes()).entradaAlvo);
    setPronto(true);
  }, [data]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    return iniciarAlarmes((a, perdido) => {
      if (perdido)
        toast.warning(`Alarme perdido: ${a.titulo}`, {
          description: `Estava marcado para as ${a.hora}.`,
        });
      else toast(a.titulo, { description: a.corpo, duration: 20000 });
    });
  }, []);

  const servicos = todos.filter((s) => s.data === data);
  const diasComServico = new Set(todos.map((s) => s.data));

  async function marcar(campo: "entrada" | "saida") {
    const novo = { ...dia, [campo]: horaAgora() };
    setDia(novo);
    await guardarDia(novo);
    toast.success(campo === "entrada" ? "Entrada registada." : "Saída registada.");
  }

  async function gravarManual() {
    const novo: Dia = {
      data,
      entrada: rascunho.entrada || null,
      saida: rascunho.saida || null,
    };
    setDia(novo);
    await guardarDia(novo);
    setEditarAberto(false);
    toast.success("Horas atualizadas manualmente.");
  }

  const totalDia =
    dia.entrada && dia.saida ? duracaoMin(dia.entrada, dia.saida) : totalMinutosServicos(servicos);
  const desvio = dia.entrada ? minutos(dia.entrada) - minutos(entradaAlvo) : null;
  const ehHoje = data === hoje;

  return (
    <AppShell
      titulo={ehHoje ? "Hoje" : "Dia selecionado"}
      subtitulo={`${diaSemana(data)}, ${formatarData(data)}`}
      acao={
        !ehHoje ? (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setData(hoje)}>
            Voltar a hoje
          </Button>
        ) : null
      }
    >
      <BannerInstalarPWA />

      {/* Calendário em destaque */}
      <Card className="overflow-hidden p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="size-4" /> Calendário
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-xs"
            onClick={() => setMesAberto((v) => !v)}
          >
            {mesAberto ? "Semana" : "Mês"}
            {mesAberto ? (
              <ChevronUp className="ml-1 size-3.5" />
            ) : (
              <ChevronDown className="ml-1 size-3.5" />
            )}
          </Button>
        </div>
        <div className="mt-2">
          <CalendarioMes
            key={mesAberto ? "mes" : "semana"}
            valor={data}
            aoEscolher={setData}
            marcados={diasComServico}
            compacto={!mesAberto}
          />
        </div>
      </Card>

      {/* Ponto do dia */}
      <Card className="mt-3 p-4 shadow-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ponto do dia
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {dia.entrada ?? "--:--"} <span className="text-muted-foreground">→</span>{" "}
              {dia.saida ?? "--:--"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" /> {formatarDuracao(totalDia)} registados
            </p>
          </div>
          <Dialog
            open={editarAberto}
            onOpenChange={(o) => {
              setEditarAberto(o);
              if (o) setRascunho({ entrada: dia.entrada ?? "", saida: dia.saida ?? "" });
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 rounded-full">
                <Pencil className="mr-1 size-3.5" /> Corrigir
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Introduzir horas manualmente</DialogTitle>
                <DialogDescription>
                  Use quando se esqueceu de picar o ponto (bateria, esquecimento justificado).
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-entrada">Entrada</Label>
                  <Input
                    id="m-entrada"
                    type="time"
                    className="h-12"
                    value={rascunho.entrada}
                    onChange={(e) => setRascunho((r) => ({ ...r, entrada: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="m-saida">Saída</Label>
                  <Input
                    id="m-saida"
                    type="time"
                    className="h-12"
                    value={rascunho.saida}
                    onChange={(e) => setRascunho((r) => ({ ...r, saida: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="h-12 w-full" onClick={gravarManual}>
                  Guardar horas
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {desvio !== null && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm">
            <AlarmClock className="size-4 shrink-0 text-muted-foreground" />
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
          <Button size="lg" className="h-14 rounded-xl text-base" onClick={() => marcar("entrada")}>
            <LogIn className="mr-1.5 size-5" /> Entrada
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-14 rounded-xl text-base"
            onClick={() => marcar("saida")}
          >
            <LogOut className="mr-1.5 size-5" /> Saída
          </Button>
        </div>
      </Card>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Serviços {ehHoje ? "de hoje" : `de ${formatarData(data)}`}
        </h2>
        <span className="text-sm text-muted-foreground">{servicos.length}</span>
      </div>

      <div className="mt-2 space-y-2.5">
        {pronto && servicos.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Sem serviços registados neste dia.
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
            className="cursor-pointer border-l-4 border-l-primary/70 p-4 shadow-card transition-colors hover:bg-accent"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
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
        className="mt-6 h-14 w-full rounded-xl text-base shadow-lift"
        onClick={() => navigate({ to: "/servico/$id", params: { id: "novo" } })}
      >
        <Plus className="mr-1.5 size-5" /> Novo serviço
      </Button>
    </AppShell>
  );
}
