import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, Camera, CalendarPlus, MapPin, Plus, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
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
  servicosParaICS,
} from "@/lib/registo";
import { comprimirFoto } from "@/lib/fotos";
import { pedirPermissaoNotificacoes } from "@/lib/alarmes";

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
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const existente = id === "novo" ? null : await lerServico(id);
      setServico(existente ?? servicoVazio());
      const todos = await listarServicos();
      setClientes([...new Set(todos.map((s) => s.cliente).filter(Boolean))]);
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
    for (const f of Array.from(files)) novos.push(await guardarFoto(await comprimirFoto(f)));
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

  async function usarLocalizacao() {
    if (!navigator.geolocation) {
      toast.error("Este telemóvel não permite localização.");
      return;
    }
    toast.info("A obter localização…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        alterar({ lat, lng });
        toast.success("Localização guardada.");
        if (!servico?.morada.trim()) {
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            );
            const j = (await r.json()) as { display_name?: string };
            if (j.display_name) alterar({ morada: j.display_name });
          } catch {
            /* morada continua manual */
          }
        }
      },
      () => toast.error("Não foi possível obter a localização."),
      { timeout: 10000, enableHighAccuracy: true },
    );
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

  return (
    <AppShell titulo={id === "novo" ? "Novo serviço" : "Editar serviço"}>
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/" })}>
        <ArrowLeft className="mr-1 size-4" /> Voltar
      </Button>

      <Card className="space-y-4 p-4">
        <div>
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            list="lista-clientes"
            value={servico.cliente}
            onChange={(e) => alterar({ cliente: e.target.value })}
            placeholder="Nome do cliente"
            className="h-12"
          />
          <datalist id="lista-clientes">
            {clientes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="morada">Morada</Label>
          <Input
            id="morada"
            value={servico.morada}
            onChange={(e) => alterar({ morada: e.target.value })}
            placeholder="Rua, número, localidade"
            className="h-12"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={usarLocalizacao}>
              <MapPin className="mr-1 size-4" /> Usar localização atual
            </Button>
            {servico.lat != null && servico.lng != null && (
              <a
                className="text-sm underline text-muted-foreground"
                href={`https://www.google.com/maps/search/?api=1&query=${servico.lat},${servico.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver no mapa
              </a>
            )}
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
          <Label htmlFor="alarme">Alarme (opcional)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="alarme"
              type="time"
              className="h-12 w-40"
              value={servico.alarme ?? ""}
              onChange={(e) => alterar({ alarme: e.target.value })}
            />
            {servico.alarme && (
              <Button variant="ghost" size="sm" onClick={() => alterar({ alarme: "" })}>
                Remover
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void pedirPermissaoNotificacoes()}>
              <Bell className="mr-1 size-4" /> Ativar avisos
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Toca com a app aberta ou em segundo plano, para lembrar a ida a este cliente.
          </p>
        </div>

        <div>
          <Label htmlFor="trabalho">Trabalho realizado</Label>
          <Textarea
            id="trabalho"
            rows={4}
            value={servico.trabalho}
            onChange={(e) => alterar({ trabalho: e.target.value })}
            placeholder="O que foi feito no cliente"
          />
        </div>

        <div>
          <Label htmlFor="obs">Observações</Label>
          <Textarea
            id="obs"
            rows={3}
            value={servico.obs}
            onChange={(e) => alterar({ obs: e.target.value })}
            placeholder="Notas, avarias encontradas, próximos passos"
          />
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12" onClick={() => partilhar("Serviço", texto)}>
          <Share2 className="mr-1 size-4" /> Partilhar
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
