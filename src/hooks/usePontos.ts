import { useEffect, useState } from "react";
import type { PontoColeta } from "../types";

// FONTE DE DADOS: public/data/pontos-coleta.json (gerado por scripts/geocode-points.mjs).
// Para ligar ao banco, troque SOMENTE a URL (ex.: "/api/pontos-coleta") mantendo o formato
// { pontos: PontoColeta[] }. Nenhum ponto é criado aqui.
const URL_PONTOS = (import.meta.env.VITE_PONTOS_URL as string | undefined) ?? `${import.meta.env.BASE_URL}data/pontos-coleta.json`;

export function usePontos() {
  const [estado, setEstado] = useState<{ carregando: boolean; erro?: string; pontos: PontoColeta[] }>({ carregando: true, pontos: [] });
  useEffect(() => {
    const ac = new AbortController();
    fetch(URL_PONTOS, { signal: ac.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: { pontos: PontoColeta[] }) =>
        setEstado({ carregando: false, pontos: (j.pontos ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) }))
      .catch((e) => { if (e.name !== "AbortError") setEstado({ carregando: false, pontos: [], erro: "Não foi possível carregar os pontos de coleta." }); });
    return () => ac.abort();
  }, []);
  return estado;
}
