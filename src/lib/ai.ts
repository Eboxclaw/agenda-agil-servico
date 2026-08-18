import type { Definicoes } from "./db";

export type Mensagem = { role: "system" | "user" | "assistant"; content: string };

export function endpointPara(d: Definicoes) {
  if (d.fornecedor === "anthropic") return "https://api.anthropic.com/v1/messages";
  if (d.fornecedor === "openai") return "https://api.openai.com/v1/chat/completions";
  if (d.fornecedor === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  return d.endpoint.trim();
}

export function modeloSugerido(fornecedor: Definicoes["fornecedor"]) {
  if (fornecedor === "anthropic") return "claude-sonnet-4-20250514";
  if (fornecedor === "openai") return "gpt-4o-mini";
  if (fornecedor === "openrouter") return "anthropic/claude-3.5-sonnet";
  return "";
}

function mensagemErro(estado: number, texto: string) {
  if (estado === 401 || estado === 403) return "Chave de API inválida ou sem permissões. Verifique nas Definições.";
  if (estado === 402) return "Sem saldo/créditos no fornecedor de IA.";
  if (estado === 429) return "Demasiados pedidos. Aguarde um momento e tente outra vez.";
  if (estado >= 500) return "O fornecedor de IA está indisponível. Tente novamente daqui a pouco.";
  return `Erro do fornecedor (${estado}): ${texto.slice(0, 200)}`;
}

export async function pedirIA(d: Definicoes, mensagens: Mensagem[]): Promise<string> {
  const url = endpointPara(d);
  if (!d.chave || !url) throw new Error("Configure o fornecedor e a chave de API nas Definições.");

  if (d.fornecedor === "anthropic") {
    const sistema = mensagens.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const resto = mensagens.filter((m) => m.role !== "system");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": d.chave,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: d.modelo,
        max_tokens: 1200,
        system: sistema,
        messages: resto.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(mensagemErro(res.status, await res.text()));
    const json = (await res.json()) as { content?: Array<{ text?: string }> };
    return json.content?.map((c) => c.text ?? "").join("") ?? "";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${d.chave}` },
    body: JSON.stringify({ model: d.modelo, messages: mensagens }),
  });
  if (!res.ok) throw new Error(mensagemErro(res.status, await res.text()));
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}
