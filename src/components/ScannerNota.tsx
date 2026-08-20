import { useCallback, useRef, useState } from "react";
import { Camera, Copy, FileText, Loader2, Scan, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { reconhecerTexto } from "@/lib/ocr";

export type NotaData = {
  texto: string;
};

type Props = {
  /** Chamado com o texto da nota quando o utilizador quer inserir no serviço */
  aoInserirNoServico?: (texto: string) => void;
};

type Estado = "idle" | "foto_tirada" | "a_reconhecer" | "texto_pronto";

export function ScannerNota({ aoInserirNoServico }: Props) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [fotoURL, setFotoURL] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [textoOriginal, setTextoOriginal] = useState("");
  const inputFoto = useRef<HTMLInputElement>(null);

  const processarFoto = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFotoURL(url);
    setEstado("foto_tirada");
    setTexto("");
    setTextoOriginal("");

    // OCR automático
    setEstado("a_reconhecer");
    try {
      const result = await reconhecerTexto(file);
      setTexto(result);
      setTextoOriginal(result);
      setEstado("texto_pronto");
      if (!result.trim()) {
        toast.info("Nenhum texto reconhecido. Tente outra foto com melhor iluminação.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao reconhecer texto: " + (err instanceof Error ? err.message : "desconhecido"));
      setEstado("foto_tirada");
    }
  }, []);

  const limpar = useCallback(() => {
    if (fotoURL) URL.revokeObjectURL(fotoURL);
    setFotoURL(null);
    setTexto("");
    setTextoOriginal("");
    setEstado("idle");
  }, [fotoURL]);

  const copiar = useCallback(() => {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(
      () => toast.success("Texto copiado."),
      () => toast.error("Não foi possível copiar."),
    );
  }, [texto]);

  const inserir = useCallback(() => {
    if (!texto.trim()) return;
    aoInserirNoServico?.(texto);
    toast.success("Texto inserido no serviço.");
    limpar();
  }, [texto, aoInserirNoServico, limpar]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          <FileText className="mr-1 inline size-4" />
          Nota digitalizada
        </h3>
        {estado !== "idle" && (
          <Button variant="ghost" size="sm" onClick={limpar} aria-label="Limpar nota">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void processarFoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {estado === "idle" && (
        <Button
          variant="outline"
          className="mt-3 h-16 w-full text-base"
          onClick={() => inputFoto.current?.click()}
        >
          <Camera className="mr-2 size-5" />
          Digitalizar nota
        </Button>
      )}

      {fotoURL && (
        <div className="mt-3">
          <img
            src={fotoURL}
            alt="Nota digitalizada"
            className="max-h-48 w-full rounded-md object-contain bg-muted"
          />
        </div>
      )}

      {estado === "a_reconhecer" && (
        <div className="mt-3 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          A reconhecer texto…
        </div>
      )}

      {estado === "texto_pronto" && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            className="min-h-[120px] w-full text-sm"
            placeholder="Texto reconhecido (editável)"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copiar}>
              <Copy className="mr-1 size-3.5" /> Copiar
            </Button>
            {aoInserirNoServico && (
              <Button size="sm" onClick={inserir}>
                <Scan className="mr-1 size-3.5" /> Inserir no serviço
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}