# Mapa de pontos de coleta (MapCN + React + TypeScript + MapLibre)

## O que foi encontrado nos dados
Não havia projeto, banco nem coordenadas: só 8 planilhas `IGUATEMI_L1xx/L2xx_ENTRADA_OK.xlsx`
(listas de passageiros por linha). Os "pontos de coleta" foram assumidos como os **endereços de embarque**
(coluna "Endereço (Embarque)"): **83 pontos únicos** (66 Porto Alegre, 11 Alvorada, 6 Viamão),
52 deles são cruzamentos ("Rua A / Rua B") e 30 têm número. Nenhum tem latitude/longitude.
As planilhas contêm nome e matrícula de passageiros: o extrator **não os lê nem grava** (LGPD).

## Fluxo de dados (sem pontos fictícios)
**Pré-requisito (só do extrator):** `python3 -m pip install -r requirements.txt` (openpyxl).
1. Coloque as planilhas em `./planilhas` e rode `npm run extrair` → `data/pontos-origem.json`.
2. `NOMINATIM_EMAIL=voce@empresa.com npm run geocodificar` → `public/data/pontos-coleta.json`
   (1 req/s, cache em `data/geocode-cache.json`). Sem resultado → `data/geocode-pendentes.json`.
3. **Revise** os pontos com `precisao: "via"` ou `"cruzamento"` (posição aproximada). Correções verificadas
   vão em `data/overrides.json`: `{ "pt-xxxx": { "lat": -30.0, "lng": -51.2 } }`.
4. Com banco: troque só `VITE_PONTOS_URL` por uma API que devolva `{ "pontos": PontoColeta[] }` (ver `src/types.ts`).

## MapCN
Já configurado: `components.json` aponta o registry `@mapcn` para `https://mapcn.dev/r/{name}.json` e o componente
está em `src/components/ui/map.tsx`. Para atualizá-lo, rode `npx shadcn@latest add @mapcn/map` de novo
(confirme o comando em https://mapcn.dev). Ele traz `maplibre-gl` v6 + `lucide-react` e é usado por `MapView.tsx`
(`Map`, `MapMarker`, `MarkerContent`, `MarkerPopup`, `MapControls`, `useMap`).
Os círculos são polígonos GeoJSON geodésicos (`@turf/circle`) em camadas MapLibre — não são pixels/CSS.

## Deploy (EasyPanel / Docker)
`Dockerfile` na raiz: build com Node 22 (`npm ci && npm run build`) e runtime Nginx na porta **3011**
(config em `deploy/nginx.conf`, com SPA fallback, gzip e cache longo para `/assets`).

No EasyPanel: **Create App → Source: GitHub → Build: Dockerfile → Port: 3011**. Nada de volume é necessário.
As `VITE_*` são embutidas no bundle em tempo de build (`ARG` no Dockerfile):

| Build arg | Padrão | Para quê |
|---|---|---|
| `VITE_PONTOS_URL` | `/data/pontos-coleta.json` | trocar por uma API (`/api/pontos-coleta`) |
| `VITE_GEOCODER_URL` | `https://nominatim.openstreetmap.org` | instância própria (libera autocomplete) |
| `VITE_GEOCODER_EMAIL` | vazio | identificação na política do Nominatim |
| `VITE_GEOCODER_AUTOCOMPLETE` | `false` | `true` só com instância própria |

Teste local: `docker build -t mapa-coleta . && docker run --rm -p 3011:3011 mapa-coleta` → http://localhost:3011.
(O `npm run dev` continua na 5173; a imagem usa 3011 para não colidir.)

O `public/data/pontos-coleta.json` é **copiado para dentro da imagem**: depois de rodar `npm run geocodificar`,
faça um novo deploy (ou troque `VITE_PONTOS_URL` por uma API para atualizar dados sem rebuild).
`planilhas/` e `data/` (planilhas e cache, LGPD) ficam fora do contexto via `.dockerignore`.

## Como testar
1. `npm install`. O MapCN já está instalado (`src/components/ui/map.tsx` + registry em `components.json`);
   para atualizar, `npx shadcn@latest add @mapcn/map`.
2. `pip install -r requirements.txt`, coloque as planilhas em `./planilhas` e rode `npm run extrair`;
   depois `NOMINATIM_EMAIL=seu@email npm run geocodificar` (≈1 req/s; cache em `data/geocode-cache.json`).
3. Revise `data/geocode-pendentes.json` (endereços que o OSM não encontrou) e os pontos com `precisao: "via"`
   (posição aproximada ao longo da rua). Correções verificadas vão em `data/overrides.json`.
4. `npm run dev` e pesquise um endereço de Porto Alegre: confira cores por faixa, áreas de cobertura e o painel
   ordenado por distância em linha reta.

## Rodar
`npm install && npm run dev` · testes de geometria: `npm test` · build: `npm run build`

## Notas
- O mapa precisa de **WebGL2** (MapLibre). Em navegador/VM sem WebGL2 a área do mapa falha ao inicializar.
- O **navegador** do usuário busca os tiles no CARTO e o worker do MapLibre no `unpkg.com`; se a rede corporativa
  bloquear esses domínios, sirva eles por conta própria (ver docs do mapcn).
- Distância = **linha reta** (haversine), nunca trajeto por ruas.
- Autocomplete ao digitar está **desligado** por padrão: a política do Nominatim público proíbe. A busca é por botão/Enter,
  com até 5 sugestões para escolher, cache em memória e limite de 1 req/s.
- Marcadores MapCN são elementos DOM: confortável para centenas de pontos; acima de alguns milhares, considere clusterização.
- Atribuição obrigatória: © OpenStreetMap contributors.
