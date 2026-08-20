import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFINICOES_PADRAO,
  apagarTudo,
  exportarTudo,
  guardarDefinicoes,
  importarTudo,
  lerDefinicoes,
  type CopiaSeguranca,
  type Definicoes,
} from "@/lib/db";
import { modeloSugerido, pedirIA } from "@/lib/ai";
import { descarregar, hojeISO } from "@/lib/registo";
import { pedirPermissaoNotificacoes } from "@/lib/alarmes";

export const Route = createFileRoute("/definicoes")({
  head: () => ({
    meta: [
      { title: "Definições — Registo de Serviços" },
      {
        name: "description",
        content:
          "Configure o horário de entrada, os seus dados, a chave de IA e faça cópias de segurança dos registos.",
      },
      { property: "og:title", content: "Definições — Registo de Serviços" },
      {
        property: "og:description",
        content: "Horário-alvo, perfil, chave de IA e cópias de segurança.",
      },
    ],
  }),
  component: Pagina,
});

const fornecedores: Array<{ v: Definicoes["fornecedor"]; label: string }> = [
  { v: "anthropic", label: "Claude (Anthropic)" },
  { v: "openai", label: "OpenAI" },
  { v: "openrouter", label: "OpenRouter" },
  { v: "custom", label: "Outro (compatível OpenAI)" },
];

function Pagina() {
  const [d, setD] = useState<Definicoes>(DEFINICOES_PADRAO);
  const [aTestar, setATestar] = useState(false);
  const inputFicheiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => setD(await lerDefinicoes()))();
  }, []);

  function alterar(patch: Partial<Definicoes>) {
    setD((atual) => ({ ...atual, ...patch }));
  }

  async function guardar() {
    await guardarDefinicoes(d);
    toast.success("Definições guardadas.");
  }

  async function testar() {
    setATestar(true);
    try {
      const r = await pedirIA(d, [{ role: "user", content: "Responde apenas: ok" }]);
      toast.success(`Ligação IA funcional: ${r.slice(0, 40)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na ligação.");
    } finally {
      setATestar(false);
    }
  }

  async function exportar() {
    const copia = await exportarTudo();
    descarregar(`copia-registo-${hojeISO()}.json`, JSON.stringify(copia, null, 2), "application/json");
  }

  async function importar(file: File | undefined) {
    if (!file) return;
    try {
      await importarTudo(JSON.parse(await file.text()) as CopiaSeguranca);
      setD(await lerDefinicoes());
      toast.success("Cópia importada.");
    } catch {
      toast.error("Ficheiro inválido.");
    }
  }

  return (
    <AppShell titulo="Definições">
      <Card className="space-y-4 p-4">
        <h2 className="font-semibold text-foreground">Trabalhador</h2>
        <div>
          <Label htmlFor="trab">Nome</Label>
          <Input id="trab" className="h-12" value={d.trabalhador} onChange={(e) => alterar({ trabalhador: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="emp">Empresa</Label>
          <Input id="emp" className="h-12" value={d.empresa} onChange={(e) => alterar({ empresa: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="alvo">Hora de entrada prevista</Label>
          <Input
            id="alvo"
            type="time"
            className="h-12"
            value={d.entradaAlvo}
            onChange={(e) => alterar({ entradaAlvo: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            A saída é livre — o app calcula as horas feitas a partir da entrada real.
          </p>
        </div>
      </Card>

      <Card className="mt-4 space-y-4 p-4">
        <h2 className="font-semibold text-foreground">Lembretes</h2>
        <label className="flex items-center justify-between gap-3 text-sm text-foreground">
          <span>Lembrete de entrada ({d.entradaAlvo})</span>
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={d.lembreteEntrada}
            onChange={(e) => alterar({ lembreteEntrada: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-foreground">
          <span>Lembrete de saída</span>
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={d.lembreteSaida}
            onChange={(e) => alterar({ lembreteSaida: e.target.checked })}
          />
        </label>
        <div>
          <Label htmlFor="saidaLembrete">Hora do lembrete de saída</Label>
          <Input
            id="saidaLembrete"
            type="time"
            className="h-12"
            value={d.saidaLembrete}
            onChange={(e) => alterar({ saidaLembrete: e.target.value })}
          />
        </div>
        <Button
          variant="outline"
          className="h-12 w-full"
          onClick={async () => {
            const ok = await pedirPermissaoNotificacoes();
            toast[ok ? "success" : "error"](
              ok ? "Notificações ativadas." : "Notificações não autorizadas.",
            );
          }}
        >
          <Bell className="mr-1 size-4" /> Ativar notificações
        </Button>
        <p className="text-xs text-muted-foreground">
          Os avisos tocam enquanto a app estiver aberta ou em segundo plano. No iPhone é preciso ter
          a app instalada no ecrã principal.
        </p>
      </Card>

      <Card className="mt-4 space-y-4 p-4">
        <h2 className="font-semibold text-foreground">Assistente IA</h2>
        <div>
          <Label htmlFor="forn">Fornecedor</Label>
          <select
            id="forn"
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={d.fornecedor}
            onChange={(e) => {
              const v = e.target.value as Definicoes["fornecedor"];
              alterar({ fornecedor: v, modelo: modeloSugerido(v) || d.modelo });
            }}
          >
            {fornecedores.map((f) => (
              <option key={f.v} value={f.v}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="chave">Chave de API</Label>
          <Input
            id="chave"
            type="password"
            className="h-12"
            value={d.chave}
            onChange={(e) => alterar({ chave: e.target.value })}
            placeholder="sk-…"
          />
          <p className="mt-1 text-xs text-muted-foreground">Guardada apenas neste telemóvel.</p>
        </div>
        <div>
          <Label htmlFor="modelo">Modelo</Label>
          <Input id="modelo" className="h-12" value={d.modelo} onChange={(e) => alterar({ modelo: e.target.value })} />
        </div>
        {d.fornecedor === "custom" && (
          <div>
            <Label htmlFor="endp">Endpoint</Label>
            <Input
              id="endp"
              className="h-12"
              value={d.endpoint}
              onChange={(e) => alterar({ endpoint: e.target.value })}
              placeholder="https://…/v1/chat/completions"
            />
          </div>
        )}
        <Button variant="outline" className="h-12 w-full" disabled={aTestar} onClick={testar}>
          {aTestar ? "A testar…" : "Testar ligação"}
        </Button>
      </Card>

      <Button size="lg" className="mt-4 h-14 w-full text-base" onClick={guardar}>
        Guardar definições
      </Button>

      <Card className="mt-4 space-y-3 p-4">
        <h2 className="font-semibold text-foreground">Cópia de segurança</h2>
        <Button variant="outline" className="h-12 w-full" onClick={exportar}>
          <Download className="mr-1 size-4" /> Exportar tudo (JSON)
        </Button>
        <input
          ref={inputFicheiro}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            void importar(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="outline" className="h-12 w-full" onClick={() => inputFicheiro.current?.click()}>
          <Upload className="mr-1 size-4" /> Importar cópia
        </Button>
        <Button
          variant="ghost"
          className="h-12 w-full text-destructive"
          onClick={async () => {
            if (!confirm("Apagar todos os serviços, dias e fotos?")) return;
            await apagarTudo();
            toast.success("Dados apagados.");
          }}
        >
          <Trash2 className="mr-1 size-4" /> Apagar todos os dados
        </Button>
      </Card>
    </AppShell>
  );
}
