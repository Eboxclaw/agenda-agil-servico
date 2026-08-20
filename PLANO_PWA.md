# 📋 Plano de Desenvolvimento — Solar Agraço (PWA)

## O que é esta app

**Solar Agraço** (também referida como "Registo de Serviços" ou "agenda-agil-servico") é uma aplicação de bolso para trabalhadores de serviço externo da empresa **Sobral Agraço**. Permite registar entradas/saídas, clientes visitados, trabalhos realizados, materiais usados e fotos — tudo offline, sem servidor nem login. Os dados ficam guardados no IndexedDB do telemóvel.

Tech stack: TanStack Start + React 19 + shadcn/ui + Tailwind 4 + IndexedDB (idb) — gerado pelo Lovable.

---

## ✅ Já implementado (nesta ronda)

- **Ícones PWA** — SVG original (sol + painel + selo verde) → PNGs 64, 128, 192, 512, maskable 192/512, apple-touch-icon 180
- **Metadados PT** — `lang="pt"`, título "Solar Agraço — Registo de Serviços", descrição real, `theme-color`, `apple-mobile-web-app-capable`, viewport com `viewport-fit=cover`
- **Manifest PWA** — `name`, `short_name`, `display: standalone`, `orientation: portrait`, ícones + maskable, `shortcuts` para Novo Serviço e Painel
- **Service Worker** — `vite-plugin-pwa` (generateSW), precache de assets, NetworkFirst para navegações (SSR online, cache offline), NetworkOnly para APIs de IA
- **Registo do SW** — `registerSW()` com toast de atualização ("Nova versão disponível — Atualizar") e confirmação offline ("Pronta para usar offline")
- **`<Toaster />` montado na raiz** — corrige bug onde os toasts nunca apareciam (4 páginas usam `toast()` sem o componente)
- **Safe-area** — `env(safe-area-inset-top)` no header e `env(safe-area-inset-bottom)` no nav inferior (essencial em iPhone instalado)
- **Hook `useInstallPrompt`** — captura `beforeinstallprompt`, `appinstalled`, deteta iOS, permite dispensar o banner
- **Banner de instalação** — cartão na página Hoje com "Instalar"; no iOS mostra passos ("Partilhar → Adicionar ao Ecrã Principal")

---

## ✅ Fases 4–6 concluídas

- **Compressão de fotos** — `src/lib/fotos.ts` (`comprimirFoto`, máx. 1600 px, JPEG 0.82) aplicada ao guardar
- **Geolocalização** — campos `lat`/`lng` no serviço, botão "Usar localização atual", reverse-geocode Nominatim quando a morada está vazia, link "Ver no mapa"
- **Alarmes** — `src/lib/alarmes.ts` com scheduler de 30 s, notificações via SW, vibração, beep e toast; lembretes de entrada/saída nas Definições e alarme por serviço; avisos de alarmes perdidos
- **Desvio de horário** — o ecrã Hoje mostra minutos antes/depois da hora prevista
- **Banner de instalação** integrado no ecrã Hoje

## 🔜 O que falta fazer

### Fase 7 — Testes em dispositivo real (offline, alarmes, câmara)
- Dev server: verificar manifest, SW ativo, console sem erros
- Testar criar/editar serviço, compressão de foto, geolocalização
- Testar alarme com disparo "agora +1 minuto"
- Offline: dev tools offline → reload → app funcional via cache, dados IndexedDB intactos
- Build de produção: `bun run build` + preview

---

## Estrutura de ficheiros a modificar / criar

| Ficheiro | Ação |
|---|---|
| `src/lib/db.ts` | Adicionar `lat`, `lng` opcionais no type `Servico` |
| `src/lib/fotos.ts` | **Novo** — `comprimirFoto()` |
| `src/lib/alarmes.ts` | **Novo** — scheduler + notificações |
| `src/routes/definicoes.tsx` | Adicionar toggles de alarme entrada/saída |
| `src/routes/servico.$id.tsx` | Adicionar geolocalização + alarme por serviço |
| `src/routes/index.tsx` | Integrar `BannerInstalarPWA` |

---

## Notas de arquitetura

- **IndexedDB schema:** a store `servicos` já indexa por `data`. Adicionar campos opcionais (`lat`, `lng`) não requer migração (o `idb` lida naturalmente com campos ausentes em registos antigos)
- **Offline-first:** a app sempre foi 100% local nos dados; o PWA apenas garante que o JavaScript e o HTML também estão disponíveis offline
- **SSR + offline:** a estratégia NetworkFirst significa que na primeira visita com internet o SSR corre normalmente. Em modo offline, o SW serve a página em cache, o React arranca e os dados vêm do IndexedDB — funciona tudo exceto o Assistente IA (que precisa de rede para a API)