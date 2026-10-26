# Build estático (Vite) + Nginx. Deploy no EasyPanel: build "Dockerfile", porta 3011.
# As variáveis VITE_* são embutidas no bundle durante o build (são públicas: nunca passe segredo por aqui).

# ---------- build ----------
# Debian (glibc) evita surpresas com binários nativos (esbuild/rollup/tailwind oxide);
# o tamanho extra não afeta a imagem final, que é só o Nginx.
FROM node:22-slim AS build
WORKDIR /app

ARG VITE_PONTOS_URL=/data/pontos-coleta.json
ARG VITE_GEOCODER_URL=https://nominatim.openstreetmap.org
ARG VITE_GEOCODER_EMAIL=
ARG VITE_GEOCODER_AUTOCOMPLETE=false
ENV VITE_PONTOS_URL=${VITE_PONTOS_URL} \
    VITE_GEOCODER_URL=${VITE_GEOCODER_URL} \
    VITE_GEOCODER_EMAIL=${VITE_GEOCODER_EMAIL} \
    VITE_GEOCODER_AUTOCOMPLETE=${VITE_GEOCODER_AUTOCOMPLETE}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.31-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Porta 3011 (a 5173 fica livre para o `npm run dev`)
EXPOSE 3011
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q --spider http://127.0.0.1:3011/healthz || exit 1
