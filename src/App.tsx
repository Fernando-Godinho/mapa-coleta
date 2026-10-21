import { useMemo, useState } from "react";
import AddressSearch from "./components/AddressSearch";
import MapView from "./components/MapView";
import ResultsPanel from "./components/ResultsPanel";
import { usePontos } from "./hooks/usePontos";
import { COR, compararComEndereco } from "./lib/geo";
import type { EnderecoPesquisado } from "./types";

export default function App() {
  const { carregando, erro, pontos } = usePontos();
  const [alvo, setAlvo] = useState<EnderecoPesquisado | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [mostrarCobertura, setMostrarCobertura] = useState(true);
  const [soProximos, setSoProximos] = useState(false);

  const resultados = useMemo(() => (alvo ? compararComEndereco(pontos, alvo) : []), [pontos, alvo]);
  const mapaComparacao = useMemo(() => (alvo ? new Map(resultados.map((r) => [r.id, r])) : null), [alvo, resultados]);
  const visiveis = useMemo(
    () => (alvo && soProximos ? pontos.filter((p) => mapaComparacao!.get(p.id)!.faixa !== "fora") : pontos),
    [pontos, alvo, soProximos, mapaComparacao],
  );
  const limpar = () => { setAlvo(null); setSelecionadoId(null); setSoProximos(false); };

  return (
    <div className="flex h-dvh flex-col gap-3 bg-slate-100 p-3">
      <AddressSearch onSelecionar={(r) => { setAlvo({ lat: r.lat, lng: r.lng, rotulo: r.rotulo }); setSelecionadoId(null); }} onLimpar={limpar} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        <div className="relative min-h-[50vh] flex-1 overflow-hidden rounded-xl border shadow-md">
          {carregando && <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">Carregando pontos de coleta…</div>}
          {erro && <div className="absolute left-3 right-3 top-3 z-30 rounded bg-red-50 p-3 text-sm text-red-800">{erro}</div>}
          {!carregando && !erro && pontos.length === 0 && (
            <div className="absolute left-3 right-3 top-3 z-30 rounded bg-amber-50 p-3 text-sm text-amber-800">
              Nenhum ponto de coleta cadastrado. Rode <code>npm run dados</code> (ver README).
            </div>
          )}
          <MapView pontos={visiveis} comparacao={mapaComparacao} alvo={alvo} selecionadoId={selecionadoId}
            mostrarCobertura={mostrarCobertura} onSelecionar={setSelecionadoId} />

          <div className="absolute bottom-6 left-3 z-20 space-y-2 rounded-lg bg-white/95 p-3 text-sm shadow-md">
            <p className="font-semibold">Legenda (linha reta)</p>
            {([["verde", "Verde — até 1 km"], ["amarelo", "Amarelo — de 1 a 2,5 km"], ["fora", "Cinza — acima de 2,5 km"]] as const).map(([f, t]) => (
              <p key={f} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COR[f] }} />{t}</p>
            ))}
            <hr />
            <label className="flex items-center gap-2"><input type="checkbox" checked={mostrarCobertura} onChange={(e) => setMostrarCobertura(e.target.checked)} />Mostrar áreas de cobertura</label>
            <label className={`flex items-center gap-2 ${alvo ? "" : "opacity-50"}`}>
              <input type="checkbox" disabled={!alvo} checked={soProximos} onChange={(e) => setSoProximos(e.target.checked)} />Somente pontos próximos (até 2,5 km)
            </label>
            {alvo && <button onClick={limpar} className="w-full rounded border px-2 py-1 hover:bg-slate-50">Limpar comparação</button>}
          </div>
        </div>

        {alvo && resultados.length > 0 && (
          <div className="flex max-h-[40vh] min-h-0 flex-col md:max-h-none md:w-96">
            <ResultsPanel resultados={resultados} selecionadoId={selecionadoId} onSelecionar={setSelecionadoId} />
          </div>
        )}
      </div>
    </div>
  );
}
