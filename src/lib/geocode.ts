// Cliente de geocodificação (Nominatim). Política de uso do servidor público:
// máx. 1 req/s, sem autocomplete no cliente, identificação do app, cache de resultados.
// Por isso a busca só dispara no botão/Enter. Para sugestões ao digitar, aponte
// VITE_GEOCODER_URL para uma instância própria e defina VITE_GEOCODER_AUTOCOMPLETE=true.
export interface ResultadoGeocode { lat: number; lng: number; rotulo: string; id: string }

const BASE = (import.meta.env.VITE_GEOCODER_URL as string | undefined) ?? "https://nominatim.openstreetmap.org";
const EMAIL = import.meta.env.VITE_GEOCODER_EMAIL as string | undefined;
export const AUTOCOMPLETE = import.meta.env.VITE_GEOCODER_AUTOCOMPLETE === "true";
const cache = new Map<string, ResultadoGeocode[]>();
let ultima = 0;

export class GeocodeError extends Error {}

export async function buscarEndereco(texto: string, sinal?: AbortSignal): Promise<ResultadoGeocode[]> {
  const q = texto.trim().replace(/\s+/g, " ");
  if (q.length < 3) return [];
  const chave = q.toLowerCase();
  const hit = cache.get(chave);
  if (hit) return hit;
  const espera = Math.max(0, ultima + 1100 - Date.now()); // respeita 1 req/s
  ultima = Date.now() + espera;
  if (espera) await new Promise((r) => setTimeout(r, espera));
  const params = new URLSearchParams({ format: "jsonv2", q, limit: "5", countrycodes: "br", addressdetails: "0", "accept-language": "pt-BR" });
  if (EMAIL) params.set("email", EMAIL);
  let r: Response;
  try { r = await fetch(`${BASE}/search?${params}`, { signal: sinal }); }
  catch (e) { if ((e as Error).name === "AbortError") throw e; throw new GeocodeError("Sem conexão com o serviço de endereços."); }
  if (!r.ok) throw new GeocodeError(r.status === 429 ? "Muitas buscas seguidas. Aguarde alguns segundos." : `Serviço de endereços indisponível (${r.status}).`);
  const dados = (await r.json()) as { place_id: number; lat: string; lon: string; display_name: string }[];
  const res = dados.map((d) => ({ id: String(d.place_id), lat: +d.lat, lng: +d.lon, rotulo: d.display_name }));
  cache.set(chave, res);
  return res;
}
