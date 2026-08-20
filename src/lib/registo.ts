import type { Dia, Servico } from "./db";

export function hojeISO(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function horaAgora(d = new Date()) {
  return d.toTimeString().slice(0, 5);
}

export function minutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function duracaoMin(inicio: string, fim: string) {
  if (!inicio || !fim) return 0;
  const d = minutos(fim) - minutos(inicio);
  return d > 0 ? d : 0;
}

export function formatarDuracao(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function diaSemana(iso: string) {
  const nomes = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return nomes[new Date(`${iso}T12:00:00`).getDay()] ?? "";
}

export function intervaloPeriodo(periodo: "dia" | "semana" | "mes", ref: Date) {
  const base = new Date(ref);
  if (periodo === "dia") return { de: hojeISO(base), ate: hojeISO(base) };
  if (periodo === "semana") {
    const dia = (base.getDay() + 6) % 7;
    const ini = new Date(base);
    ini.setDate(base.getDate() - dia);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    return { de: hojeISO(ini), ate: hojeISO(fim) };
  }
  const ini = new Date(base.getFullYear(), base.getMonth(), 1);
  const fim = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { de: hojeISO(ini), ate: hojeISO(fim) };
}

export function totalMinutosServicos(servicos: Servico[]) {
  return servicos.reduce((t, s) => t + duracaoMin(s.inicio, s.fim), 0);
}

export function resumoTexto(servicos: Servico[], dias: Dia[], titulo: string, trabalhador: string) {
  const linhas: string[] = [`*${titulo}*`];
  if (trabalhador) linhas.push(`Trabalhador: ${trabalhador}`);
  linhas.push("");
  const porDia = new Map<string, Servico[]>();
  for (const s of servicos) {
    const lista = porDia.get(s.data) ?? [];
    lista.push(s);
    porDia.set(s.data, lista);
  }
  for (const data of [...porDia.keys()].sort()) {
    const dia = dias.find((d) => d.data === data);
    const cab = `${diaSemana(data)} ${formatarData(data)}`;
    linhas.push(
      dia?.entrada || dia?.saida
        ? `${cab} — entrada ${dia?.entrada ?? "--:--"} / saída ${dia?.saida ?? "--:--"}`
        : cab,
    );
    for (const s of porDia.get(data)!) {
      linhas.push(
        `• ${s.inicio}-${s.fim} ${s.cliente}${s.morada ? ` (${s.morada})` : ""}: ${s.trabalho || "—"}`,
      );
      if (s.materiais.length)
        linhas.push(
          `   Material: ${s.materiais.map((m) => `${m.descricao} ${m.quantidade}`.trim()).join(", ")}`,
        );
      if (s.obs) linhas.push(`   Obs: ${s.obs}`);
    }
    linhas.push("");
  }
  linhas.push(`Total de horas: ${formatarDuracao(totalMinutosServicos(servicos))}`);
  return linhas.join("\n");
}

export function servicosParaCSV(servicos: Servico[], dias: Dia[]) {
  const cab = [
    "Data", "Entrada do dia", "Saída do dia", "Início", "Fim",
    "Duração (min)", "Cliente", "Morada", "Trabalho", "Observações", "Materiais", "Nº fotos",
  ];
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const linhas = servicos.map((s) => {
    const dia = dias.find((d) => d.data === s.data);
    return [
      s.data,
      dia?.entrada ?? "",
      dia?.saida ?? "",
      s.inicio,
      s.fim,
      String(duracaoMin(s.inicio, s.fim)),
      s.cliente,
      s.morada,
      s.trabalho,
      s.obs,
      s.materiais.map((m) => `${m.descricao} ${m.quantidade}`.trim()).join("; "),
      String(s.fotoIds.length),
    ]
      .map(esc)
      .join(",");
  });
  return [cab.map(esc).join(","), ...linhas].join("\n");
}

function icsData(data: string, hora: string) {
  const [a, m, d] = data.split("-");
  const [h, min] = (hora || "09:00").split(":");
  return `${a}${m}${d}T${h}${min}00`;
}

export function servicosParaICS(servicos: Servico[]) {
  const eventos = servicos.map((s) =>
    [
      "BEGIN:VEVENT",
      `UID:${s.id}@registo-servicos`,
      `DTSTART:${icsData(s.data, s.inicio)}`,
      `DTEND:${icsData(s.data, s.fim || s.inicio)}`,
      `SUMMARY:${s.cliente || "Serviço"}`,
      `LOCATION:${s.morada.replace(/\n/g, " ")}`,
      `DESCRIPTION:${[s.trabalho, s.obs].filter(Boolean).join(" | ").replace(/\n/g, " ")}`,
      "END:VEVENT",
    ].join("\r\n"),
  );
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Registo Servicos//PT",
    ...eventos, "END:VCALENDAR",
  ].join("\r\n");
}

export function descarregar(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function partilhar(titulo: string, texto: string) {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: titulo, text: texto });
      return "partilhado";
    } catch {
      return "cancelado";
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  return "whatsapp";
}

/**
 * Partilha um ficheiro via navigator.share (suporta WhatsApp/Telegram).
 * Fallback para descarregar() quando a API de ficheiros não está disponível.
 */
export async function partilharFicheiro(nome: string, conteudo: string, tipo: string) {
  const nav = navigator as Navigator & {
    share?: (d: ShareData) => Promise<void>;
    canShare?: (d: ShareData) => boolean;
  };
  const blob = new Blob([conteudo], { type: tipo });
  const file = new File([blob], nome, { type: tipo });
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return;
    } catch {
      // user cancelou ou não conseguiu
    }
  }
  descarregar(nome, conteudo, tipo);
}
