import { Link } from "@tanstack/react-router";
import { CalendarRange, Home, Settings, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";

const abas = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/painel", label: "Painel", icon: CalendarRange },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
  { to: "/definicoes", label: "Definições", icon: Settings },
] as const;

export function AppShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{titulo}</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {abas.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
