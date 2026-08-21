import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hojeISO } from "@/lib/registo";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function CalendarioMes({
  valor,
  aoEscolher,
  marcados = new Set<string>(),
  compacto = false,
}: {
  valor: string;
  aoEscolher: (iso: string) => void;
  marcados?: Set<string>;
  /** mostra apenas a semana do dia selecionado */
  compacto?: boolean;
}) {
  const [mesRef, setMesRef] = useState(() => new Date(`${valor}T12:00:00`));
  const hoje = hojeISO();

  const celulas = useMemo(() => {
    if (compacto) {
      const base = new Date(`${valor}T12:00:00`);
      const offset = (base.getDay() + 6) % 7;
      const ini = new Date(base);
      ini.setDate(base.getDate() - offset);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ini);
        d.setDate(ini.getDate() + i);
        return { iso: hojeISO(d), dia: d.getDate(), doMes: true };
      });
    }
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const offset = (primeiro.getDay() + 6) % 7;
    const ini = new Date(primeiro);
    ini.setDate(primeiro.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(ini);
      d.setDate(ini.getDate() + i);
      return { iso: hojeISO(d), dia: d.getDate(), doMes: d.getMonth() === mes };
    }).slice(0, offset + new Date(ano, mes + 1, 0).getDate() > 35 ? 42 : 35);
  }, [mesRef, valor, compacto]);

  function moverMes(dir: 1 | -1) {
    const d = new Date(mesRef);
    d.setMonth(d.getMonth() + dir);
    setMesRef(d);
  }

  return (
    <div>
      {!compacto && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => moverMes(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-semibold text-foreground">
            {MESES[mesRef.getMonth()]} {mesRef.getFullYear()}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => moverMes(1)}
            aria-label="Mês seguinte"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {DIAS.map((d, i) => (
          <span key={`${d}${i}`}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((c) => {
          const sel = c.iso === valor;
          const ehHoje = c.iso === hoje;
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => aoEscolher(c.iso)}
              className={[
                "relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                sel
                  ? "bg-primary font-semibold text-primary-foreground"
                  : c.doMes
                    ? "text-foreground hover:bg-accent"
                    : "text-muted-foreground/50 hover:bg-accent",
                !sel && ehHoje ? "ring-1 ring-primary/60" : "",
              ].join(" ")}
            >
              {c.dia}
              {marcados.has(c.iso) && (
                <span
                  className={`absolute bottom-1 size-1.5 rounded-full ${
                    sel ? "bg-primary-foreground" : "bg-primary"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
