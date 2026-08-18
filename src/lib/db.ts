import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Material = { id: string; descricao: string; quantidade: string };

export type Servico = {
  id: string;
  /** data no formato YYYY-MM-DD */
  data: string;
  cliente: string;
  morada: string;
  /** HH:MM */
  inicio: string;
  /** HH:MM */
  fim: string;
  trabalho: string;
  obs: string;
  materiais: Material[];
  fotoIds: string[];
  criadoEm: number;
};

export type Dia = {
  /** YYYY-MM-DD */
  data: string;
  entrada: string | null;
  saida: string | null;
};

export type Foto = { id: string; blob: Blob; criadoEm: number };

export type Definicoes = {
  id: "app";
  trabalhador: string;
  empresa: string;
  fornecedor: "anthropic" | "openai" | "openrouter" | "custom";
  chave: string;
  modelo: string;
  endpoint: string;
};

interface RegistoDB extends DBSchema {
  servicos: { key: string; value: Servico; indexes: { data: string } };
  dias: { key: string; value: Dia };
  fotos: { key: string; value: Foto };
  definicoes: { key: string; value: Definicoes };
}

let dbPromise: Promise<IDBPDatabase<RegistoDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RegistoDB>("registo-servicos", 1, {
      upgrade(db) {
        const servicos = db.createObjectStore("servicos", { keyPath: "id" });
        servicos.createIndex("data", "data");
        db.createObjectStore("dias", { keyPath: "data" });
        db.createObjectStore("fotos", { keyPath: "id" });
        db.createObjectStore("definicoes", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export function novoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFINICOES_PADRAO: Definicoes = {
  id: "app",
  trabalhador: "",
  empresa: "Sobral Agraço",
  fornecedor: "openrouter",
  chave: "",
  modelo: "anthropic/claude-3.5-sonnet",
  endpoint: "",
};

export async function lerDefinicoes(): Promise<Definicoes> {
  const db = await getDB();
  const guardadas = await db.get("definicoes", "app");
  return { ...DEFINICOES_PADRAO, ...(guardadas ?? {}) };
}

export async function guardarDefinicoes(d: Definicoes) {
  const db = await getDB();
  await db.put("definicoes", { ...d, id: "app" });
}

export async function listarServicos(): Promise<Servico[]> {
  const db = await getDB();
  const todos = await db.getAll("servicos");
  return todos.sort((a, b) => (a.data + a.inicio < b.data + b.inicio ? 1 : -1));
}

export async function listarServicosPorIntervalo(de: string, ate: string) {
  const todos = await listarServicos();
  return todos.filter((s) => s.data >= de && s.data <= ate);
}

export async function lerServico(id: string) {
  const db = await getDB();
  return (await db.get("servicos", id)) ?? null;
}

export async function guardarServico(s: Servico) {
  const db = await getDB();
  await db.put("servicos", s);
}

export async function apagarServico(id: string) {
  const db = await getDB();
  const s = await db.get("servicos", id);
  if (s) for (const fid of s.fotoIds) await db.delete("fotos", fid);
  await db.delete("servicos", id);
}

export async function guardarFoto(blob: Blob) {
  const db = await getDB();
  const foto: Foto = { id: novoId(), blob, criadoEm: Date.now() };
  await db.put("fotos", foto);
  return foto.id;
}

export async function lerFoto(id: string) {
  const db = await getDB();
  return (await db.get("fotos", id)) ?? null;
}

export async function apagarFoto(id: string) {
  const db = await getDB();
  await db.delete("fotos", id);
}

export async function lerDia(data: string): Promise<Dia> {
  const db = await getDB();
  return (await db.get("dias", data)) ?? { data, entrada: null, saida: null };
}

export async function listarDias(): Promise<Dia[]> {
  const db = await getDB();
  return db.getAll("dias");
}

export async function guardarDia(dia: Dia) {
  const db = await getDB();
  await db.put("dias", dia);
}

export type CopiaSeguranca = {
  versao: 1;
  servicos: Servico[];
  dias: Dia[];
  definicoes: Definicoes;
};

export async function exportarTudo(): Promise<CopiaSeguranca> {
  return {
    versao: 1,
    servicos: await listarServicos(),
    dias: await listarDias(),
    definicoes: await lerDefinicoes(),
  };
}

export async function importarTudo(copia: CopiaSeguranca) {
  const db = await getDB();
  for (const s of copia.servicos ?? []) await db.put("servicos", s);
  for (const d of copia.dias ?? []) await db.put("dias", d);
  if (copia.definicoes) await db.put("definicoes", { ...copia.definicoes, id: "app" });
}

export async function apagarTudo() {
  const db = await getDB();
  await db.clear("servicos");
  await db.clear("dias");
  await db.clear("fotos");
}
