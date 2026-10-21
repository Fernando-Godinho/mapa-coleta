import { COR, contarFaixas, fmtKm } from "../lib/geo";
import type { PontoComDistancia } from "../types";

interface Props { resultados: PontoComDistancia[]; selecionadoId: string | null; onSelecionar: (id: string) => void }
const ROTULO = { verde: "Até 1 km", amarelo: "1 a 2,5 km", fora: "Acima de 2,5 km" } as const;

export default function ResultsPanel({ resultados, selecionadoId, onSelecionar }: Props) {
  const n = contarFaixas(resultados);
  const proximos = n.verde + n.amarelo;
  return (
    <section aria-label="Resultados da comparação" className="flex min-h-0 flex-col rounded-xl border bg-white shadow-md">
      <div className="space-y-2 border-b p-3">
        <div className="flex flex-wrap gap-2 text-sm font-medium">
          {(["verde", "amarelo", "fora"] as const).map((f) => (
            <span key={f} className="rounded-full px-2.5 py-1 text-white" style={{ background: COR[f] }}>{ROTULO[f]}: {n[f]}</span>
          ))}
        </div>
        <p className="text-xs text-slate-600">Distâncias em <strong>linha reta</strong> (não é o trajeto por ruas).</p>
        {proximos === 0 && <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">Nenhum ponto de coleta em até 2,5 km deste endereço. O mais próximo está a {fmtKm(resultados[0].distanciaKm)} km.</p>}
      </div>
      <ol className="min-h-0 flex-1 overflow-auto">
        {resultados.map((r, i) => (
          <li key={r.id}>
            <button onClick={() => onSelecionar(r.id)} aria-pressed={r.id === selecionadoId}
              className={`flex w-full items-start gap-3 border-b p-3 text-left hover:bg-slate-50 ${r.id === selecionadoId ? "bg-blue-50" : ""}`}>
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: COR[r.faixa] }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  <span className="truncate">{r.nome}</span>
                  {i === 0 && <span className="shrink-0 rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">Mais próximo</span>}
                </span>
                <span className="block truncate text-xs text-slate-600">{r.endereco}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{fmtKm(r.distanciaKm)} km</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
