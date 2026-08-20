import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, ClipboardPaste, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFINICOES_PADRAO,
  apagarTudo,
  exportarTudo,
  guardarDefinicoes,
  guardarServico,
  importarTudo,
  lerDefinicoes,
  type CopiaSeguranca,
  type Definicoes,
  type Servico,
} from "@/lib/db";
import { modeloSugerido, pedirIA } from "@/lib/ai";
import { descarregar, hojeISO } from "@/lib/registo";

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

function validarCartaoJSON(texto: string): { servicos: Servico[]; ok: boolean; erro?: string } {
  try {
    const obj = JSON.parse(texto);
    // Suporta versão 2 (cartão-servico) e backup normal (CopiaSeguranca)
    if (obj.versao === 2 && obj.tipo === "cartao-servico" && Array.isArray(obj.servicos)) {
      return { servicos: obj.servicos, ok: true };
    }
    if (obj.versao === 1 && Array.isArray(obj.servicos)) {
      return { servicos: obj.servicos, ok: true };
    }
    return { servicos: [], ok: false, erro: "Formato inválido — estrutura desconhecida." };
  } catch {
    return { servicos: [], ok: false, erro: "JSON inválido. Verifique o conteúdo." };
  }
}

function Pagina() {
  const [d, setD] = useState<Definicoes>(DEFINICOES_PADRAO);
  const [aTestar, setATestar] = useState(false);
  const [cartaoTexto, setCartaoTexto] = useState("");
  const [aImportar, setAImportar] = useState(false);
  const inputFicheiro = useRef<HTMLInputElement>(null);
  const inputCartao = useRef<HTMLInputElement>(null);

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

  async function importarCartao() {
    if (!cartaoTexto.trim()) {
      toast.error("Cole o conteúdo do cartão primeiro.");
      return;
    }
    setAImportar(true);
    const resultado = validarCartaoJSON(cartaoTexto);
    if (!resultado.ok) {
      toast.error(resultado.erro ?? "Erro ao ler cartão.");
      setAImportar(false);
      return;
    }
    try {
      let contador = 0;
      for (const s of resultado.servicos) {
        await guardarServico(s);
        contador++;
      }
      toast.success(`${contador} serviço(s) importados com sucesso.`);
      setCartaoTexto("");
    } catch {
      toast.error("Erro ao guardar os serviços importados.");
    } finally {
      setAImportar(false);
    }
  }

  async function importarCartaoFicheiro(file: File | undefined) {
    if (!file) return;
    setCartaoTexto(await file.text());
    // Dispara automaticamente após carregar o texto
    const texto = await file.text();
    setCartaoTexto(texto);
    const resultado = validarCartaoJSON(texto);
    if (!resultado.ok) {
      toast.error(resultado.erro ?? "Ficheiro inválido.");
      return;
    }
    try {
      let contador = 0;
      for (const s of resultado.servicos) {
        await guardarServico(s);
        contador++;
      }
      toast.success(`${contador} serviço(s) importados do ficheiro.`);
      setCartaoTexto("");
    } catch {
      toast.error("Erro ao guardar os serviços do ficheiro.");
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

      <Card className="mt-4 space-y-3 p-4">
        <h2 className="font-semibold text-foreground">Importar cartão de serviço</h2>
        <p className="text-xs text-muted-foreground">
          Cole aqui o JSON de um cartão recebido de outro dispositivo (Botão "Cartão" no Painel / Clientes / Serviço).
        </p>
        <Textarea
          rows={4}
          value={cartaoTexto}
          onChange={(e) => setCartaoTexto(e.target.value)}
          placeholder='{"versao":2,"tipo":"cartao-servico","servicos":[...]}'
        />
        <div className="flex gap-2">
          <Button variant="outline" className="h-12 flex-1" disabled={aImportar} onClick={importarCartao}>
            <ClipboardPaste className="mr-1 size-4" /> {aImportar ? "A importar…" : "Importar cartão"}
          </Button>
          <input
            ref={inputCartao}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              void importarCartaoFicheiro(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" className="h-12" onClick={() => inputCartao.current?.click()}>
            <Upload className="size-4" />
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
