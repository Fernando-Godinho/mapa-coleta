import circle from "@turf/circle";
import distance from "@turf/distance";
import type { Feature, FeatureCollection, Polygon, Position } from "geojson";
import type { Faixa, PontoColeta, PontoComDistancia } from "../types";

export const RAIO_VERDE_KM = 1;
export const RAIO_TOTAL_KM = 2.5;
export const COR = { verde: "#16a34a", amarelo: "#eab308", fora: "#6b7280" } as const;

/** Distância em linha reta (haversine via turf, esfera de 6371,0088 km). NÃO é distância por ruas. */
export const distanciaKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  distance([a.lng, a.lat], [b.lng, b.lat], { units: "kilometers" });

export const faixaDe = (km: number): Faixa => (km <= RAIO_VERDE_KM ? "verde" : km <= RAIO_TOTAL_KM ? "amarelo" : "fora");

/** Compara pelo valor exibido (2 casas) para a cor nunca contradizer o número na tela. */
export const faixaExibida = (km: number): Faixa => faixaDe(Math.round(km * 100) / 100);

const disco = (p: PontoColeta, km: number, steps = 96): Position[] =>
  (circle([p.lng, p.lat], km, { steps, units: "kilometers" }).geometry as Polygon).coordinates[0];

/** Disco verde (0–1 km) e anel amarelo (1–2,5 km, com furo de 1 km): coordenadas geodésicas, independem do zoom. */
export function coberturaGeoJSON(pontos: PontoColeta[]) {
  const verde: Feature<Polygon>[] = [], amarelo: Feature<Polygon>[] = [];
  for (const p of pontos) {
    const props = { id: p.id };
    verde.push({ type: "Feature", properties: props, geometry: { type: "Polygon", coordinates: [disco(p, RAIO_VERDE_KM)] } });
    amarelo.push({ type: "Feature", properties: props, geometry: { type: "Polygon",
      coordinates: [disco(p, RAIO_TOTAL_KM), [...disco(p, RAIO_VERDE_KM)].reverse()] } }); // furo com sentido inverso
  }
  const fc = (features: Feature<Polygon>[]): FeatureCollection<Polygon> => ({ type: "FeatureCollection", features });
  return { verde: fc(verde), amarelo: fc(amarelo) };
}

export function compararComEndereco(pontos: PontoColeta[], alvo: { lat: number; lng: number }): PontoComDistancia[] {
  return pontos
    .map((p) => { const d = distanciaKm(alvo, p); return { ...p, distanciaKm: d, faixa: faixaExibida(d) }; })
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
}

export const contarFaixas = (r: PontoComDistancia[]) => ({
  verde: r.filter((x) => x.faixa === "verde").length,
  amarelo: r.filter((x) => x.faixa === "amarelo").length,
  fora: r.filter((x) => x.faixa === "fora").length,
});
export const fmtKm = (km: number) => km.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
