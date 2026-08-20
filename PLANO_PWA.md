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

## 🔜 O que falta fazer

### Fase 4 — Compressão de fotos
- Criar `src/lib/fotos.ts` com `comprimirFoto(blob, maxLado=1600, qualidade=0.82)`
- Usar `createImageBitmap` com orientação EXIF `+ canvas` para redimensionar antes de guardar no IndexedDB
- Aplicar no editor de serviço (`guardarFoto`)
- Fotos antigas ficam como estão (sem migração)

### Fase 5 — Geolocalização no serviço
- Campos `lat` / `lng` opcionais no type `Servico` (no `src/lib/db.ts`)
- Botão "Usar localização atual" no editor de serviço
- `navigator.geolocation.getCurrentPosition` (timeout 10s)
- Se morada vazia, tentar reverse-geocode (Nominatim grátis, falha silenciosa)
- Mostrar link "Ver no mapa" (Google/Apple Maps) quando há coordenadas

### Fase 6 — Alarmes e lembretes
- **Definições:** toggles "Lembrete de entrada" (hora = entradaAlvo), "Lembrete de saída" (hora configurável), botão "Ativar notificações" (pedir permissão)
- **Editor de serviço:** toggle + hora para alarme por cliente ("chegar ao cliente X")
- **Motor de alarmes** (`src/lib/alarmes.ts`):
  - Calcula próximos alarmes a partir de Definições + Dia de hoje + serviços com alarme
  - Scheduler com `setInterval` 30s enquanto a app está aberta
  - Ao disparar: `showNotification` via registo SW + vibrate + toast + beep (WebAudio)
  - Estado "disparado" em localStorage para evitar repetições
  - Ao abrir a app: banner "alarmes perdidos" para os que passaram fechados
- **Nota:** iOS limita notificações push sem servidor; funcionam com app aberta/em background. Android tem mais margem graças ao SW.

### Fase 7 — Testes e verificação
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