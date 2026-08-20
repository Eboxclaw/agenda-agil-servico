/**
 * OCR service usando Tesseract.js (WASM no browser, sem API key).
 * - Lazy-load do worker e modelo 'por' (português)
 * - Cache automático em IndexedDB (Tesseract.js faz nativamente)
 * - Timeout de inactividade: worker é terminado após 5min
 */

let workerPromise: ReturnType<typeof criarWorker> | null = null;
let timeoutTerminar: ReturnType<typeof setTimeout> | null = null;

function agendarTerminar() {
  if (timeoutTerminar) clearTimeout(timeoutTerminar);
  timeoutTerminar = setTimeout(() => {
    if (workerPromise) {
      workerPromise.then((w) => {
        if (w && typeof w.terminate === "function") {
          w.terminate().catch(() => {});
        }
      });
      workerPromise = null;
    }
  }, 5 * 60 * 1000);
}

async function criarWorker() {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1);
  await worker.setParameters({
    // @ts-expect-error - tipo PSM exacto não exportado, mas o valor "3" é válido
    tessedit_pageseg_mode: "3",
    preserve_interword_spaces: "0",
  });
  return worker;
}

/**
 * Devolve o worker Tesseract (cria se não existir, ou reutiliza o anterior)
 */
async function obterWorker() {
  if (timeoutTerminar) clearTimeout(timeoutTerminar);
  if (!workerPromise) {
    workerPromise = criarWorker();
  }
  agendarTerminar();
  return workerPromise;
}

/**
 * Reconhece texto a partir de um Blob de imagem (foto tirada pela câmara).
 * @param blob - Blob da imagem (JPEG/PNG)
 * @returns Texto reconhecido (linhas separadas por \n)
 */
export async function reconhecerTexto(blob: Blob): Promise<string> {
  const worker = await obterWorker();
  const { data } = await worker.recognize(blob);
  return data.text || "";
}

/**
 * Descarrega o worker da memória (liberta ~150-200 MB).
 * Chamar quando o OCR já não for necessário.
 */
export async function descarregarWorkerOcr() {
  if (timeoutTerminar) clearTimeout(timeoutTerminar);
  if (workerPromise) {
    const worker = await workerPromise;
    if (worker && typeof worker.terminate === "function") {
      await worker.terminate();
    }
    workerPromise = null;
  }
}