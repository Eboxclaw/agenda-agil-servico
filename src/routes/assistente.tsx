import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEFINICOES_PADRAO, lerDefinicoes, listarDias, listarServicos, type Definicoes } from "@/lib/db";
import { pedirIA, type Mensagem } from "@/lib/ai";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente — Registo de Serviços" },
      {
        name: "description",
        content: "Pergunte às suas horas e serviços: resumos do dia, relatórios do mês e totais por cliente.",
      },
      { property: "og:title", content: "Assistente — Registo de Serviços" },
      {
        property: "og:description",
        content: "Assistente que responde com base nos seus registos guardados no telemóvel.",
      },
    ],
  }),
  component: Assistente,
});

function Assistente() {
  const [d, setD] = useState<Definicoes>(DEFINICOES_PADRAO);
  const [contexto, setContexto] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    void (async () => {
      setD(await lerDefinicoes());
      const servicos = await listarServicos();
      const dias = await listarDias();
      setContexto(JSON.stringify({ servicos: servicos.slice(0, 200), dias: dias.slice(-90) }));
    })();
  }, []);

  async function enviar() {
    if (!texto.trim()) return;
    if (!d.chave) {
      toast.error("Configure a chave de API nas Definições.");
      return;
    }
    const novas: Mensagem[] = [...mensagens, { role: "user", content: texto.trim() }];
    setMensagens(novas);
    setTexto("");
    setAEnviar(true);
    try {
      const resposta = await pedirIA(d, [
        {
          role: "system",
          content:
            "És um assistente em português de Portugal para um técnico de serviços. Responde de forma curta e prática com base nestes registos (JSON): " +
            contexto,
        },
        ...novas,
      ]);
      setMensagens([...novas, { role: "assistant", content: resposta }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao contactar a IA.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <AppShell titulo="Assistente">
      {!d.chave && (
        <Card className="p-4 text-sm text-muted-foreground">
          Adicione a chave de API nas Definições para usar o assistente.
        </Card>
      )}

      <div className="mt-3 space-y-3">
        {mensagens.length === 0 && (
          <Card className="p-4 text-sm text-muted-foreground">
            Experimente: “Quantas horas fiz esta semana?” ou “Escreve o relatório do mês”.
          </Card>
        )}
        {mensagens.map((m, i) => (
          <Card
            key={i}
            className={`p-3 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-secondary text-secondary-foreground" : "text-foreground"
            }`}
          >
            {m.content}
          </Card>
        ))}
        {aEnviar && <p className="text-sm text-muted-foreground">A pensar…</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <Textarea
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva a sua pergunta"
        />
        <Button className="h-auto px-4" disabled={aEnviar} onClick={enviar} aria-label="Enviar">
          <Send className="size-5" />
        </Button>
      </div>
    </AppShell>
  );
}
