import { lerDefinicoes, lerDia, listarServicosPorIntervalo } from "./db";
import { hojeISO, horaAgora, minutos } from "./registo";

export type Alarme = { chave: string; hora: string; titulo: string; corpo: string };

const CHAVE_DISPARADOS = "alarmes-disparados";

function disparados(): Record<string, true> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DISPARADOS) ?? "{}") as Record<string, true>;
  } catch {
    return {};
  }
}

function marcarDisparado(chave: string) {
  const atual = disparados();
  atual[chave] = true;
  // manter só as chaves de hoje
  const hoje = hojeISO();
  const limpo = Object.fromEntries(Object.keys(atual).filter((k) => k.startsWith(hoje)).map((k) => [k, true]));
  localStorage.setItem(CHAVE_DISPARADOS, JSON.stringify(limpo));
}

export function jaDisparado(chave: string) {
  return Boolean(disparados()[chave]);
}

/** Lista os alarmes previstos para hoje (ainda relevantes ou já passados). */
export async function alarmesDeHoje(): Promise<Alarme[]> {
  const data = hojeISO();
  const [def, dia, servicos] = await Promise.all([
    lerDefinicoes(),
    lerDia(data),
    listarServicosPorIntervalo(data, data),
  ]);
  const lista: Alarme[] = [];

  if (def.lembreteEntrada && !dia.entrada) {
    lista.push({
      chave: `${data}|entrada`,
      hora: def.entradaAlvo,
      titulo: "Hora de entrada",
      corpo: `Marque a entrada (previsto ${def.entradaAlvo}).`,
    });
  }
  if (def.lembreteSaida && !dia.saida) {
    lista.push({
      chave: `${data}|saida`,
      hora: def.saidaLembrete,
      titulo: "Fim do dia",
      corpo: "Marque a saída e confirme os serviços do dia.",
    });
  }
  for (const s of servicos) {
    if (!s.alarme) continue;
    lista.push({
      chave: `${data}|servico|${s.id}`,
      hora: s.alarme,
      titulo: s.cliente || "Serviço",
      corpo: `${s.morada || "Serviço agendado"} às ${s.alarme}.`,
    });
  }
  return lista.sort((a, b) => minutos(a.hora) - minutos(b.hora));
}

export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  const r = await Notification.requestPermission();
  return r === "granted";
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => void ctx.close(), 800);
  } catch {
    /* som opcional */
  }
}

async function notificar(a: Alarme) {
  navigator.vibrate?.([200, 100, 200]);
  beep();
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.showNotification(a.titulo, { body: a.corpo, tag: a.chave, icon: "/icon-192.png" });
      else new Notification(a.titulo, { body: a.corpo, tag: a.chave });
    }
  } catch {
    /* notificação opcional */
  }
}

/**
 * Verifica alarmes a cada 30 s enquanto a app está aberta.
 * `aoDisparar` recebe o alarme para mostrar também um toast na interface.
 */
export function iniciarAlarmes(aoDisparar: (a: Alarme, perdido: boolean) => void) {
  let parado = false;
  let primeira = true;

  async function ciclo() {
    if (parado) return;
    const agora = minutos(horaAgora());
    const lista = await alarmesDeHoje();
    for (const a of lista) {
      if (jaDisparado(a.chave)) continue;
      const alvo = minutos(a.hora);
      if (agora < alvo) continue;
      const perdido = primeira && agora - alvo > 5;
      marcarDisparado(a.chave);
      if (!perdido) void notificar(a);
      aoDisparar(a, perdido);
    }
    primeira = false;
  }

  void ciclo();
  const t = setInterval(() => void ciclo(), 30_000);
  return () => {
    parado = true;
    clearInterval(t);
  };
}
