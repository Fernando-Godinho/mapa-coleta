import { useEffect, useRef, useState } from "react";
import { AUTOCOMPLETE, buscarEndereco, GeocodeError, type ResultadoGeocode } from "../lib/geocode";

interface Props { onSelecionar: (r: ResultadoGeocode) => void; onLimpar: () => void }
type Estado = "ocioso" | "carregando" | "sem-resultado" | "erro" | "ok";

export default function AddressSearch({ onSelecionar, onLimpar }: Props) {
  const [texto, setTexto] = useState("");
  const [opcoes, setOpcoes] = useState<ResultadoGeocode[]>([]);
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [msg, setMsg] = useState("");
  const ac = useRef<AbortController | null>(null);

  async function buscar(t = texto) {
    if (t.trim().length < 3) return;
    ac.current?.abort();
    ac.current = new AbortController();
    setEstado("carregando");
    try {
      const r = await buscarEndereco(t, ac.current.signal);
      setOpcoes(r);
      setEstado(r.length ? "ok" : "sem-resultado");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMsg(e instanceof GeocodeError ? e.message : "Falha ao consultar o endereço.");
      setEstado("erro");
    }
  }

  // Sugestões ao digitar: só com instância própria de geocodificador (ver lib/geocode.ts).
  useEffect(() => {
    if (!AUTOCOMPLETE) return;
    const t = setTimeout(() => buscar(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function limpar() { ac.current?.abort(); setTexto(""); setOpcoes([]); setEstado("ocioso"); onLimpar(); }
  function escolher(r: ResultadoGeocode) { setTexto(r.rotulo); setOpcoes([]); setEstado("ocioso"); onSelecionar(r); }

  return (
    <section className="rounded-xl border-2 border-blue-600 bg-white p-3 shadow-md md:p-4">
      <label htmlFor="busca-endereco" className="mb-2 block text-base font-bold text-slate-900 md:text-lg">
        Digite um endereço para comparar a cobertura
      </label>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); buscar(); }} role="search">
        <div className="relative flex-1">
          <input id="busca-endereco" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off"
            placeholder="Rua, número, bairro, cidade ou CEP"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          {texto && (
            <button type="button" onClick={limpar} aria-label="Limpar pesquisa"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
          )}
        </div>
        <button type="submit" disabled={estado === "carregando" || texto.trim().length < 3}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">
          {estado === "carregando" ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <div aria-live="polite" className="mt-2 text-sm">
        {estado === "sem-resultado" && <p className="text-amber-700">Endereço não encontrado. Confira a grafia ou inclua bairro e cidade.</p>}
        {estado === "erro" && <p className="text-red-700">{msg} <button className="underline" onClick={() => buscar()}>Tentar novamente</button></p>}
      </div>
      {opcoes.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y overflow-auto rounded-lg border bg-white text-sm" role="listbox">
          {opcoes.map((o) => (
            <li key={o.id}>
              <button role="option" aria-selected={false} onClick={() => escolher(o)} className="w-full px-3 py-2 text-left hover:bg-blue-50">{o.rotulo}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
