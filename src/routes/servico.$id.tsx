import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, CalendarPlus, Download, FileText, Mic, Plus, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BotaoVoz } from "@/components/BotaoVoz";
import { ScannerNota } from "@/components/ScannerNota";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  apagarFoto,
  apagarServico,
  guardarFoto,
  guardarServico,
  lerFoto,
  lerServico,
  lerDefinicoes,
  listarServicos,
  novoId,
  type Material,
  type Servico,
} from "@/lib/db";
import {
  descarregar,
  duracaoMin,
  formatarDuracao,
  hojeISO,
  horaAgora,
  partilhar,
  partilharFicheiro,
  servicosParaICS,
} from "@/lib/registo";
import { abrirParaPDF, cartaoServico, relatorioDOC, relatorioMarkdown } from "@/lib/relatorio";
import { relatorioHTML } from "@/lib/relatorio";

export const Route = createFileRoute("/servico/$id")({
  head: () => ({
    meta: [
      { title: "Serviço — Registo de Serviços" },
      {
        name: "description",
        content: "Registe cliente, morada, horas, trabalho realizado, materiais e fotografias do serviço.",
      },
      { property: "og:title", content: "Serviço — Registo de Serviços" },
      {
        property: "og:description",
        content: "Cliente, morada, horas, trabalho, materiais e fotografias de cada serviço.",
      },
    ],
  }),
  component: PaginaServico,
});

function servicoVazio(): Servico {
  return {
    id: novoId(),
    data: hojeISO(),
    cliente: "",
    morada: "",
    inicio: horaAgora(),
    fim: "",
    trabalho: "",
    obs: "",
    materiais: [],
    fotoIds: [],
    criadoEm: Date.now(),
  };
}

function PaginaServico() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [servico, setServico] = useState<Servico | null>(null);
  const [clientes, setClientes] = useState<string[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState({ trabalhador: "", empresa: "" });
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const existente = id === "novo" ? null : await lerServico(id);
      setServico(existente ?? servicoVazio());
      const todos = await listarServicos();
      setClientes([...new Set(todos.map((s) => s.cliente).filter(Boolean))]);
      const def = await lerDefinicoes();
      setMeta({ trabalhador: def.trabalhador, empresa: def.empresa });
    })();
  }, [id]);

  const fotoIds = servico?.fotoIds.join(",") ?? "";
  useEffect(() => {
    let vivo = true;
    const criados: string[] = [];
    void (async () => {
      const mapa: Record<string, string> = {};
      for (const fid of fotoIds ? fotoIds.split(",") : []) {
        const foto = await lerFoto(fid);
        if (foto) {
          const url = URL.createObjectURL(foto.blob);
          criados.push(url);
          mapa[fid] = url;
        }
      }
      if (vivo) setUrls(mapa);
    })();
    return () => {
      vivo = false;
      criados.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [fotoIds]);

  const alterar = useCallback((patch: Partial<Servico>) => {
    setServico((s) => (s ? { ...s, ...patch } : s));
  }, []);

  if (!servico) return <AppShell titulo="Serviço">A carregar…</AppShell>;

  async function adicionarFotos(files: FileList | null) {
    if (!files || !servico) return;
    const novos: string[] = [];
    for (const f of Array.from(files)) novos.push(await guardarFoto(f));
    alterar({ fotoIds: [...servico.fotoIds, ...novos] });
  }

  async function removerFoto(fid: string) {
    if (!servico) return;
    await apagarFoto(fid);
    alterar({ fotoIds: servico.fotoIds.filter((x) => x !== fid) });
  }

  function alterarMaterial(mid: string, patch: Partial<Material>) {
    if (!servico) return;
    alterar({
      materiais: servico.materiais.map((m) => (m.id === mid ? { ...m, ...patch } : m)),
    });
  }

  async function guardar() {
    if (!servico) return;
    if (!servico.cliente.trim()) {
      toast.error("Indique o cliente.");
      return;
    }
    await guardarServico(servico);
    toast.success("Serviço guardado.");
    navigate({ to: "/" });
  }

  async function eliminar() {
    if (!servico) return;
    await apagarServico(servico.id);
    toast.success("Serviço apagado.");
    navigate({ to: "/" });
  }

  const texto = `${servico.cliente} — ${servico.data} ${servico.inicio}-${servico.fim}\n${servico.morada}\n${servico.trabalho}${servico.obs ? `\nObs: ${servico.obs}` : ""}${
    servico.materiais.length
      ? `\nMaterial: ${servico.materiais.map((m) => `${m.descricao} ${m.quantidade}`.trim()).join(", ")}`
      : ""
  }`;

  async function exportar(tipo: "pdf" | "doc" | "md" | "cartao") {
    if (!servico) return;
    const lista = [servico];
    const nome = `servico-${servico.id.slice(0, 8)}`;
    if (tipo === "pdf") {
      const html = await relatorioHTML(lista, [], `Serviço — ${servico.cliente}`, meta);
      abrirParaPDF(html);
    } else if (tipo === "doc") {
      await relatorioDOC(lista, [], `Serviço — ${servico.cliente}`, meta);
    } else if (tipo === "md") {
      const md = relatorioMarkdown(lista, [], `Serviço — ${servico.cliente}`, meta);
      descarregar(`${nome}.md`, md, "text/markdown;charset=utf-8");
    } else if (tipo === "cartao") {
      const json = await cartaoServico(lista, []);
      await partilharFicheiro(`${nome}.scard`, json, "application/json");
    }
  }

  return (
    <AppShell titulo={id === "novo" ? "Novo serviço" : "Editar serviço"}>
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/" })}>
        <ArrowLeft className="mr-1 size-4" /> Voltar
      </Button>

      <Card className="space-y-4 p-4">
        <div>
          <Label htmlFor="cliente">Cliente</Label>
          <div className="flex gap-2">
            <Input
              id="cliente"
              list="lista-clientes"
              value={servico.cliente}
              onChange={(e) => alterar({ cliente: e.target.value })}
              placeholder="Nome do cliente"
              className="h-12 flex-1"
            />
            <BotaoVoz aoResultado={(t) => alterar({ cliente: t })} />
          </div>
          <datalist id="lista-clientes">
            {clientes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="morada">Morada</Label>
          <div className="flex gap-2">
            <Input
              id="morada"
              value={servico.morada}
              onChange={(e) => alterar({ morada: e.target.value })}
              placeholder="Rua, número, localidade"
              className="h-12 flex-1"
            />
            <BotaoVoz aoResultado={(t) => alterar({ morada: t })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={servico.data}
              onChange={(e) => alterar({ data: e.target.value })}
              className="h-12"
            />
          </div>
          <div>
            <Label htmlFor="inicio">Início</Label>
            <Input
              id="inicio"
              type="time"
              value={servico.inicio}
              onChange={(e) => alterar({ inicio: e.target.value })}
              className="h-12"
            />
          </div>
          <div>
            <Label htmlFor="fim">Fim</Label>
            <Input
              id="fim"
              type="time"
              value={servico.fim}
              onChange={(e) => alterar({ fim: e.target.value })}
              className="h-12"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Duração: {formatarDuracao(duracaoMin(servico.inicio, servico.fim))}
          </p>
          <Button variant="outline" size="sm" onClick={() => alterar({ fim: horaAgora() })}>
            Terminar agora
          </Button>
        </div>

        <div>
          <Label htmlFor="trabalho">Trabalho realizado</Label>
          <div className="flex gap-2">
            <Textarea
              id="trabalho"
              rows={4}
              value={servico.trabalho}
              onChange={(e) => alterar({ trabalho: e.target.value })}
              placeholder="O que foi feito no cliente"
              className="flex-1"
            />
            <BotaoVoz aoResultado={(t) => alterar({ trabalho: t })} className="mt-0" />
          </div>
        </div>

        <div>
          <Label htmlFor="obs">Observações</Label>
          <div className="flex gap-2">
            <Textarea
              id="obs"
              rows={3}
              value={servico.obs}
              onChange={(e) => alterar({ obs: e.target.value })}
              placeholder="Notas, avarias encontradas, próximos passos"
              className="flex-1"
            />
            <BotaoVoz aoResultado={(t) => alterar({ obs: t })} className="mt-0" />
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Materiais gastos</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              alterar({
                materiais: [
                  ...servico.materiais,
                  { id: novoId(), descricao: "", quantidade: "" },
                ],
              })
            }
          >
            <Plus className="mr-1 size-4" /> Adicionar
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {servico.materiais.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem materiais registados.</p>
          )}
          {servico.materiais.map((m) => (
            <div key={m.id} className="flex gap-2">
              <Input
                value={m.descricao}
                onChange={(e) => alterarMaterial(m.id, { descricao: e.target.value })}
                placeholder="Material"
                className="h-12"
              />
              <Input
                value={m.quantidade}
                onChange={(e) => alterarMaterial(m.id, { quantidade: e.target.value })}
                placeholder="Qtd."
                className="h-12 w-24"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={() =>
                  alterar({ materiais: servico.materiais.filter((x) => x.id !== m.id) })
                }
                aria-label="Remover material"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <ScannerNota
        aoInserirNoServico={(texto) => {
          const linhas = texto.split("\n").filter(Boolean);
          if (linhas.length > 0) alterar({ cliente: linhas[0] || "" });
          if (linhas.length > 1) alterar({ morada: linhas[1] || "" });
          if (linhas.length > 2) alterar({ trabalho: linhas.slice(2).join("\n") });
        }}
      />

      <Card className="mt-4 p-4">
        <h2 className="font-semibold text-foreground">Fotografias</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {servico.fotoIds.map((fid) => (
            <div key={fid} className="relative">
              {urls[fid] && (
                <img
                  src={urls[fid]}
                  alt="Fotografia do serviço"
                  className="aspect-square w-full rounded-md object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removerFoto(fid)}
                aria-label="Apagar fotografia"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            void adicionarFotos(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="mt-3 h-12 w-full"
          onClick={() => inputFoto.current?.click()}
        >
          <Camera className="mr-1 size-5" /> Tirar / escolher foto
        </Button>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Button variant="outline" className="h-12" onClick={() => partilhar("Serviço", texto)}>
          <Share2 className="mr-1 size-4" /> Partilhar
        </Button>
        <Button variant="outline" className="h-12" onClick={() => exportar("pdf")}>
          <FileText className="mr-1 size-4" /> PDF
        </Button>
        <Button variant="outline" className="h-12" onClick={() => exportar("doc")}>
          <Download className="mr-1 size-4" /> Word
        </Button>
        <Button variant="outline" className="h-12" onClick={() => exportar("md")}>
          <FileText className="mr-1 size-4" /> Markdown
        </Button>
        <Button variant="outline" className="h-12" onClick={() => exportar("cartao")}>
          <Share2 className="mr-1 size-4" /> Cartão
        </Button>
        <Button
          variant="outline"
          className="h-12"
          onClick={() =>
            descarregar(`servico-${servico.data}.ics`, servicosParaICS([servico]), "text/calendar")
          }
        >
          <CalendarPlus className="mr-1 size-4" /> Calendário
        </Button>
      </div>

      <Button size="lg" className="mt-3 h-14 w-full text-base" onClick={guardar}>
        Guardar serviço
      </Button>
      {id !== "novo" && (
        <Button variant="ghost" className="mt-2 h-12 w-full text-destructive" onClick={eliminar}>
          <Trash2 className="mr-1 size-4" /> Apagar serviço
        </Button>
      )}
    </AppShell>
  );
}
