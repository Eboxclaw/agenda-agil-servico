import { lerFoto, type Dia, type Servico } from "./db";
import { duracaoMin, formatarData, formatarDuracao, diaSemana, totalMinutosServicos } from "./registo";

async function blobParaDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Falha a ler a fotografia."));
    fr.readAsDataURL(blob);
  });
}

export async function fotosDataURL(ids: string[]) {
  const out: string[] = [];
  for (const id of ids) {
    const foto = await lerFoto(id);
    if (foto) out.push(await blobParaDataURL(foto.blob));
  }
  return out;
}

const esc = (v: string) =>
  (v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

export type MetaRelatorio = { trabalhador?: string; empresa?: string };

/** Relatório completo (HTML autónomo, com fotografias embebidas) pronto a guardar/imprimir/enviar. */
export async function relatorioHTML(
  servicos: Servico[],
  dias: Dia[],
  titulo: string,
  meta: MetaRelatorio = {},
): Promise<string> {
  const blocos: string[] = [];
  for (const s of servicos) {
    const fotos = await fotosDataURL(s.fotoIds);
    const dia = dias.find((d) => d.data === s.data);
    blocos.push(`
    <section class="s">
      <h2>${esc(s.cliente || "Sem cliente")} — ${formatarData(s.data)}</h2>
      <table>
        <tr><th>Dia</th><td>${diaSemana(s.data)}, ${formatarData(s.data)}</td></tr>
        <tr><th>Entrada / saída do dia</th><td>${dia?.entrada ?? "--:--"} → ${dia?.saida ?? "--:--"}</td></tr>
        <tr><th>Horas do serviço</th><td>${esc(s.inicio)} – ${esc(s.fim || "—")} (${formatarDuracao(duracaoMin(s.inicio, s.fim))})</td></tr>
        <tr><th>Morada</th><td>${esc(s.morada)}</td></tr>
        <tr><th>Trabalho realizado</th><td>${esc(s.trabalho)}</td></tr>
        <tr><th>Observações</th><td>${esc(s.obs) || "—"}</td></tr>
        <tr><th>Materiais</th><td>${
          s.materiais.length
            ? s.materiais.map((m) => esc(`${m.descricao} ${m.quantidade}`.trim())).join("<br>")
            : "—"
        }</td></tr>
      </table>
      ${fotos.length ? `<div class="f">${fotos.map((d) => `<img src="${d}" alt="Fotografia do serviço">`).join("")}</div>` : ""}
    </section>`);
  }

  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>
 body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:24px;color:#1c1917;background:#fff}
 h1{font-size:22px;margin:0 0 4px} .m{color:#78716c;font-size:13px;margin-bottom:18px}
 .s{border:1px solid #e7e5e4;border-radius:10px;padding:14px;margin-bottom:14px;page-break-inside:avoid}
 .s h2{font-size:16px;margin:0 0 8px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{text-align:left;width:170px;vertical-align:top;color:#78716c;font-weight:600;padding:4px 8px 4px 0}
 td{padding:4px 0;vertical-align:top}
 .f{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
 .f img{width:150px;height:150px;object-fit:cover;border-radius:8px}
</style></head>
<body>
<h1>${esc(titulo)}</h1>
<div class="m">${esc(meta.empresa ?? "")}${meta.trabalhador ? ` · ${esc(meta.trabalhador)}` : ""} · ${servicos.length} serviço(s) · Total ${formatarDuracao(totalMinutosServicos(servicos))}</div>
${blocos.join("\n")}
</body></html>`;
}

/** Pacote JSON com todos os dados do serviço, fotografias incluídas. */
export async function servicoJSONCompleto(servicos: Servico[], dias: Dia[]) {
  const comFotos = [] as Array<Servico & { fotos: string[] }>;
  for (const s of servicos) comFotos.push({ ...s, fotos: await fotosDataURL(s.fotoIds) });
  return JSON.stringify({ versao: 1, geradoEm: new Date().toISOString(), servicos: comFotos, dias }, null, 2);
}

export function servicoTerminado(s: Servico) {
  return Boolean(s.fim && s.cliente.trim());
}
