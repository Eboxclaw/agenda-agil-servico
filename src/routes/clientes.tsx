import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, MapPin, Search, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lerDefinicoes, listarDias, listarServicos, type Dia, type Servico } from "@/lib/db";
import { relatorioHTML, servicoJSONCompleto, servicoTerminado } from "@/lib/relatorio";
import {
  descarregar,
  duracaoMin,
  formatarData,
  formatarDuracao,
  partilhar,
  resumoTexto,
  servicosParaCSV,
  totalMinutosServicos,
} from "@/lib/registo";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Registo de Serviços" },
      {
        name: "description",
        content:
          "Lista de clientes criada a partir dos serviços fechados, com horas, moradas e exportação de relatório por cliente.",
      },
      { property: "og:title", content: "Clientes — Registo de Serviços" },
      {
        property: "og:description",
        content: "Todos os clientes com serviços concluídos, horas totais e relatórios prontos a enviar.",
      },
    ],
  }),
  component: Clientes,
});

function normalizar(v: string) {
  return v.trim().toLowerCase();
}

function Clientes() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [dias, setDias] = useState<Dia[]>([]);
  const [meta, setMeta] = useState({ trabalhador: "", empresa: "" });
  const [procura, setProcura] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setServicos(await listarServicos());
      setDias(await listarDias());
      const d = await lerDefinicoes();
      setMeta({ trabalhador: d.trabalhador, empresa: d.empresa });
    })();
  }, []);

  const clientes = useMemo(() => {
    const mapa = new Map<string, { nome: string; servicos: Servico[] }>();
    for (const s of servicos) {
      if (!servicoTerminado(s)) continue;
      const chave = normalizar(s.cliente);
      const atual = mapa.get(chave) ?? { nome: s.cliente.trim(), servicos: [] };
      atual.servicos.push(s);
      mapa.set(chave, atual);
    }
    return [...mapa.values()]
      .filter((c) => normalizar(c.nome).includes(normalizar(procura)))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  }, [servicos, procura]);

  async function exportarRelatorio(nome: string, lista: Servico[]) {
    toast.info("A preparar relatório com fotografias…");
    const html = await relatorioHTML(lista, dias, `Relatório — ${nome}`, meta);
    descarregar(`relatorio-${nome.replace(/\W+/g, "-").toLowerCase()}.html`, html, "text/html");
    toast.success("Relatório exportado.");
  }

  async function exportarJSON(nome: string, lista: Servico[]) {
    const json = await servicoJSONCompleto(lista, dias);
    descarregar(`dados-${nome.replace(/\W+/g, "-").toLowerCase()}.json`, json, "application/json");
  }

  return (
    <AppShell titulo="Clientes">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={procura}
          onChange={(e) => setProcura(e.target.value)}
          placeholder="Procurar cliente"
          className="h-12 pl-9"
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {clientes.length} cliente(s) com serviços concluídos.
      </p>

      <div className="mt-3 space-y-3">
        {clientes.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Ainda não há clientes. Feche um serviço (com cliente e hora de fim) para aparecer aqui.
          </Card>
        )}

        {clientes.map((c) => {
          const total = totalMinutosServicos(c.servicos);
          const ultimo = [...c.servicos].sort((a, b) => (a.data < b.data ? 1 : -1))[0]!;
          const moradas = [...new Set(c.servicos.map((s) => s.morada).filter(Boolean))];
          const expandido = aberto === c.nome;
          return (
            <Card key={c.nome} className="p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setAberto(expandido ? null : c.nome)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{c.nome}</p>
                    {moradas[0] && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" /> {moradas[0]}
                        {moradas.length > 1 ? ` +${moradas.length - 1}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Último serviço: {formatarData(ultimo.data)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-foreground">{formatarDuracao(total)}</p>
                    <p className="text-xs text-muted-foreground">{c.servicos.length} serviço(s)</p>
                  </div>
                </div>
              </button>

              {expandido && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {c.servicos.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate({ to: "/servico/$id", params: { id: s.id } })}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="min-w-0 truncate text-foreground">
                        {formatarData(s.data)} · {s.trabalho || "Serviço"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatarDuracao(duracaoMin(s.inicio, s.fim))}
                      </span>
                    </button>
                  ))}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() => exportarRelatorio(c.nome, c.servicos)}
                    >
                      <FileText className="mr-1 size-4" /> Relatório
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        descarregar(
                          `servicos-${c.nome.replace(/\W+/g, "-").toLowerCase()}.csv`,
                          servicosParaCSV(c.servicos, dias),
                          "text/csv",
                        )
                      }
                    >
                      <Download className="mr-1 size-4" /> CSV
                    </Button>
                    <Button variant="outline" className="h-11" onClick={() => exportarJSON(c.nome, c.servicos)}>
                      <Download className="mr-1 size-4" /> JSON + fotos
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        partilhar(
                          c.nome,
                          resumoTexto(c.servicos, dias, `Serviços — ${c.nome}`, meta.trabalhador),
                        )
                      }
                    >
                      <Share2 className="mr-1 size-4" /> Partilhar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
