import { useEffect, useMemo } from "react";
import { LngLatBounds, type GeoJSONSource } from "maplibre-gl";
import { Map as MapaBase, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from "@/components/ui/map"; // MapCN (shadcn registry)
import { COR, coberturaGeoJSON, fmtKm } from "../lib/geo";
import type { EnderecoPesquisado, Faixa, PontoColeta, PontoComDistancia } from "../types";

interface Props {
  pontos: PontoColeta[];                  // pontos a desenhar (já filtrados)
  comparacao: Map<string, PontoComDistancia> | null;
  alvo: EnderecoPesquisado | null;
  selecionadoId: string | null;
  mostrarCobertura: boolean;
  onSelecionar: (id: string) => void;
}

const COBERTURA = [
  { id: "cobertura-verde", src: "cobertura-verde-src", cor: COR.verde, fillOpacity: 0.18 },
  { id: "cobertura-amarelo", src: "cobertura-amarelo-src", cor: COR.amarelo, fillOpacity: 0.14 },
];

/** Círculos geodésicos (polígonos GeoJSON em lng/lat): mantêm 1 km / 2,5 km reais em qualquer zoom. */
function Cobertura({ pontos, visivel }: { pontos: PontoColeta[]; visivel: boolean }) {
  const { map, isLoaded } = useMap();
  const dados = useMemo(() => coberturaGeoJSON(pontos), [pontos]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const aplicar = () => {
      const fontes = [dados.verde, dados.amarelo];
      COBERTURA.forEach((c, i) => {
        const src = map.getSource(c.src) as GeoJSONSource | undefined;
        if (src) src.setData(fontes[i]);
        else {
          map.addSource(c.src, { type: "geojson", data: fontes[i] });
          map.addLayer({ id: c.id, type: "fill", source: c.src, paint: { "fill-color": c.cor, "fill-opacity": c.fillOpacity } });
          map.addLayer({ id: c.id + "-borda", type: "line", source: c.src, paint: { "line-color": c.cor, "line-width": 1.5, "line-opacity": 0.85 } });
        }
        const vis = visivel ? "visible" : "none";
        map.setLayoutProperty(c.id, "visibility", vis);
        map.setLayoutProperty(c.id + "-borda", "visibility", vis);
      });
    };
    aplicar();
    map.on("styledata", aplicar); // reaplica se o estilo base for trocado (ex.: tema claro/escuro)
    return () => { map.off("styledata", aplicar); };
  }, [map, isLoaded, dados, visivel]);
  return null;
}

/** Enquadramento: alvo + pontos relevantes, ou alvo + ponto selecionado. */
function Camera({ pontos, alvo, selecionadoId, comparacao }: Pick<Props, "pontos" | "alvo" | "selecionadoId" | "comparacao">) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const b = new LngLatBounds();
    const sel = pontos.find((p) => p.id === selecionadoId);
    if (alvo) b.extend([alvo.lng, alvo.lat]);
    if (sel) b.extend([sel.lng, sel.lat]);
    else if (alvo && comparacao) comparacao.forEach((p) => { if (p.faixa !== "fora") b.extend([p.lng, p.lat]); });
    else if (!alvo) pontos.forEach((p) => b.extend([p.lng, p.lat]));
    if (b.isEmpty()) return;
    const pad = window.innerWidth < 768 ? 40 : 80;
    map.fitBounds(b, { padding: pad, maxZoom: 16, duration: 800 });
  }, [map, isLoaded, alvo, selecionadoId, comparacao, pontos]);
  return null;
}

const corDe = (f?: Faixa) => (f ? COR[f] : "#2563eb");

export default function MapView({ pontos, comparacao, alvo, selecionadoId, mostrarCobertura, onSelecionar }: Props) {
  return (
    <MapaBase center={[-51.2, -30.03]} zoom={10} className="h-full w-full">
      <MapControls showZoom showLocate={false} />
      <Cobertura pontos={pontos} visivel={mostrarCobertura} />
      <Camera pontos={pontos} alvo={alvo} selecionadoId={selecionadoId} comparacao={comparacao} />

      {pontos.map((p) => {
        const c = comparacao?.get(p.id);
        const sel = p.id === selecionadoId;
        return (
          <MapMarker key={p.id} longitude={p.lng} latitude={p.lat} onClick={() => onSelecionar(p.id)}>
            <MarkerContent>
              <div
                aria-label={`Ponto de coleta: ${p.nome}`}
                style={{ background: corDe(c?.faixa), width: sel ? 26 : 18, height: sel ? 26 : 18, zIndex: sel ? 10 : 1 }}
                className={`rounded-full border-2 border-white shadow-md ${sel ? "ring-4 ring-blue-500/50" : ""}`}
              />
            </MarkerContent>
            <MarkerPopup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{p.nome}</p>
                <p>{p.endereco}</p>
                <p className="text-xs opacity-70">Lat {p.lat.toFixed(5)}, Lng {p.lng.toFixed(5)}</p>
                {p.precisao && p.precisao !== "numero" && p.precisao !== "manual" && (
                  <p className="text-xs text-amber-600">Posição aproximada ({p.precisao === "via" ? "ao longo da via" : "cruzamento"}).</p>
                )}
                {c && <p className="font-medium">{fmtKm(c.distanciaKm)} km em linha reta</p>}
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}

      {alvo && (
        <MapMarker longitude={alvo.lng} latitude={alvo.lat}>
          <MarkerContent>
            <div aria-label="Endereço pesquisado" className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-white bg-fuchsia-600 text-white shadow-lg" style={{ zIndex: 20 }}>★</div>
          </MarkerContent>
          <MarkerPopup><p className="text-sm font-semibold">Endereço pesquisado</p><p className="text-sm">{alvo.rotulo}</p></MarkerPopup>
        </MapMarker>
      )}
    </MapaBase>
  );
}
