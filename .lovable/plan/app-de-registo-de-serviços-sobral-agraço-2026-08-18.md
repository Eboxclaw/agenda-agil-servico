# App de Registo de Serviços (Sobral Agraço)

App web mobile-first, em português, sem backend: tudo fica guardado no próprio telemóvel.

## Importante antes de começar

Sem Lovable Cloud não há base de dados na nuvem. Os dados (serviços, fotos, horas) ficam guardados **apenas no dispositivo** (IndexedDB do browser). Consequências:

- Funciona offline e é imediato.
- Não sincroniza entre telemóveis nem com colegas (para isso seria preciso backend mais tarde).
- Se apagar os dados do browser, perde o histórico — por isso incluo exportação/importação de cópia de segurança (JSON) e exportação mensal.
- A chave de API de IA fica guardada no dispositivo e as chamadas saem direto do telemóvel para o fornecedor.

## Ecrãs

1. **Hoje (início)**
   - Botão grande "Entrada" / "Saída" (regista hora e mostra total do dia).
   - Lista dos serviços de hoje com hora, cliente e estado.
   - Botão "+ Novo serviço".

2. **Serviço (criar/editar)**
   - Cliente (com sugestões de clientes já usados), morada.
   - Hora de início / fim (auto-preenchido, editável) e duração calculada.
   - Trabalho realizado, observações.
   - Materiais gastos (linhas: descrição + quantidade).
   - Fotos: tirar com a câmara ou escolher da galeria, várias por serviço, com pré-visualização e apagar.
   - Guardar / Duplicar / Apagar.

3. **Painel (dashboard)**
   - Alternador Dia / Semana / Mês.
   - Totais: horas trabalhadas, nº de serviços, clientes distintos, materiais.
   - Lista agrupada por dia com entrada/saída e serviços.
   - Exportar o período: JSON, CSV e um resumo em texto pronto a enviar por WhatsApp/Telegram (botão "Partilhar" usa a partilha nativa do telemóvel).

4. **Definições**
   - Nome do trabalhador, empresa.
   - IA: escolher fornecedor (Anthropic Claude, OpenAI, OpenRouter, ou endpoint compatível), colar chave de API, escolher modelo, testar ligação.
   - Cópia de segurança: exportar / importar tudo.
   - Apagar dados.

5. **Assistente IA**
   - Chat que responde com base nos registos locais (ex.: "quantas horas fiz esta semana?", "resume o serviço de ontem na Rua X", "escreve o relatório do mês").
   - Também pode preencher um serviço a partir de texto ditado/escrito ("estive das 9 às 11 no cliente Y, troquei torneira").
   - Só funciona depois de configurar a chave nas Definições; mostra erro claro se a chave falhar.

## Calendário e WhatsApp/Telegram

Sem backend não há sincronização automática. Fica assim:
- **Calendário**: cada serviço pode ser exportado como ficheiro `.ics` e adicionado ao calendário do telemóvel; também exportação do mês inteiro.
- **WhatsApp/Telegram**: botão de partilha que envia o resumo do dia/serviço através da app instalada (link `wa.me` / partilha nativa). Sincronização bidirecional real exigiria backend — deixamos para depois.

## Detalhes técnicos

- TanStack Start, rotas: `/` (Hoje), `/servico/$id`, `/painel`, `/definicoes`, `/assistente`.
- Armazenamento: IndexedDB via `idb`; fotos guardadas como Blob, mostradas com object URLs.
- Modelo de dados: `servicos` (id, data, cliente, morada, inicio, fim, trabalho, obs, materiais[], fotoIds[]), `dias` (data, entrada, saida), `fotos` (id, blob), `definicoes`.
- IA: chamada direta do cliente ao endpoint escolhido nas Definições, com a chave do utilizador (nunca em código). Tratamento de erros 401/402/429 com mensagem em português.
- Interface: mobile-first, botões grandes, tipografia legível, tokens de cor no design system (tema quente/industrial, sem roxo genérico), navegação inferior com 4 separadores.
- SEO/head por rota em português.

## Ordem de implementação

1. Design system + navegação + camada de dados IndexedDB.
2. Ecrã Hoje com entrada/saída e lista.
3. Formulário de serviço com fotos e materiais.
4. Painel dia/semana/mês + exportações (CSV/JSON/ICS/partilha).
5. Definições (perfil, chave de IA, cópia de segurança).
6. Assistente IA.
