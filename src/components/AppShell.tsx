import { Link } from "@tanstack/react-router";
import { CalendarRange, Home, Settings, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Marca } from "@/components/Marca";

const abas = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/painel", label: "Painel", icon: CalendarRange },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
  { to: "/definicoes", label: "Definições", icon: Settings },
] as const;

export function AppShell({
  titulo,
  subtitulo,
  acao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Marca className="h-9" />
            <div className="min-w-0 border-l border-border pl-3">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
              )}
            </div>
          </div>
          {acao && <div className="shrink-0">{acao}</div>}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-4">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {abas.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="group flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
            >
              <span className="rounded-full px-3 py-1 transition-colors group-hover:bg-accent">
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
