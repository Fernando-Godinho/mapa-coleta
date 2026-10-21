// Geocodifica data/pontos-origem.json via Nominatim e grava public/data/pontos-coleta.json.
// Política do Nominatim: máx. 1 req/s, User-Agent identificável, cache obrigatório.
// Uso: NOMINATIM_EMAIL=voce@empresa.com node scripts/geocode-points.mjs
// Nada é inventado: pontos sem resultado ficam em data/geocode-pendentes.json.
// Correções manuais (verificadas por uma pessoa) vão em data/overrides.json:
//   { "pt-xxxxxxxxxx": { "lat": -30.0, "lng": -51.2 } }
import fs from "node:fs";

const EMAIL = process.env.NOMINATIM_EMAIL;
if (!EMAIL) { console.error("Defina NOMINATIM_EMAIL (identificação exigida pela política de uso)."); process.exit(1); }
const BASE = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
const read = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d);
const origem = read("data/pontos-origem.json", []);
if (!origem.length) {
  console.error("data/pontos-origem.json vazio ou ausente: rode `npm run extrair` com as planilhas em ./planilhas.");
  process.exit(1);
}
const cache = read("data/geocode-cache.json", {});
const overrides = read("data/overrides.json", {});
const ABREV = [[/^Av\.?\s/i, "Avenida "], [/^R\.\s/i, "Rua "], [/^Estr\.?\s/i, "Estrada "], [/^Tv\.?\s/i, "Travessa "],
  [/\bPres\.\s/gi, "Presidente "], [/\bSen\.\s/gi, "Senador "], [/\bDr\.\s/gi, "Doutor "], [/\bTen\.\s/gi, "Tenente "], [/\bCel\.\s/gi, "Coronel "]];
const norm = (s) => ABREV.reduce((acc, [re, to]) => acc.replace(re, to), s);
const semAcento = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// O Nominatim público não resolve cruzamentos ("A & B"), então cada rua é tentada
// separadamente e o resultado sai marcado como "via" (posição aproximada).
function consultas(p) {
  const loc = `${p.bairro}, ${p.cidade}, ${p.uf}, Brasil`;
  const locCidade = `${p.cidade}, ${p.uf}, Brasil`;
  const a = norm(p.logradouro);
  if (p.cruzamento) {
    const b = norm(p.cruzamento);
    return [{ q: `${a}, ${loc}`, precisao: "via" }, { q: `${a}, ${locCidade}`, precisao: "via" },
            { q: `${b}, ${loc}`, precisao: "via" }, { q: `${b}, ${locCidade}`, precisao: "via" }];
  }
  if (p.numero) return [{ q: `${a}, ${p.numero}, ${loc}`, precisao: "numero" },
                        { q: `${a}, ${loc}`, precisao: "via" },
                        { q: `${a}, ${locCidade}`, precisao: "via" }]; // aproximado: marcado como tal
  return [{ q: `${a}, ${loc}`, precisao: "via" }, { q: `${a}, ${locCidade}`, precisao: "via" }];
}

async function buscar(q, cidade) {
  if (cache[q] !== undefined) return cache[q];
  const url = `${BASE}/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&email=${encodeURIComponent(EMAIL)}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { "User-Agent": `mapa-coleta/1.0 (${EMAIL})` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json())[0];
  // Descarta resultado de outra cidade (o bairro pode ter nome repetido no estado).
  const valido = j && semAcento(j.display_name).includes(semAcento(cidade));
  cache[q] = valido ? { lat: +j.lat, lng: +j.lon, nome: j.display_name } : null;
  fs.writeFileSync("data/geocode-cache.json", JSON.stringify(cache, null, 1));
  await sleep(1100);
  return cache[q];
}

const pontos = [], pendentes = [];
for (const p of origem) {
  const nome = [p.cruzamento ? `${p.logradouro} / ${p.cruzamento}` : `${p.logradouro}${p.numero ? ", " + p.numero : ""}`, p.referencia && `(${p.referencia})`].filter(Boolean).join(" ");
  const base = { id: p.id, nome, endereco: p.enderecoOriginal, linhas: p.linhas };
  if (overrides[p.id]) { pontos.push({ ...base, ...overrides[p.id], precisao: "manual" }); continue; }
  let achou = null;
  for (const c of consultas(p)) {
    const res = await buscar(c.q, p.cidade);
    if (res) { achou = { ...res, precisao: c.precisao }; break; }
  }
  if (achou) pontos.push({ ...base, lat: achou.lat, lng: achou.lng, precisao: achou.precisao, resolvidoComo: achou.nome });
  else pendentes.push({ id: p.id, endereco: p.enderecoOriginal });
  process.stdout.write(achou ? "." : "x");
}
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/pontos-coleta.json", JSON.stringify({ geradoEm: new Date().toISOString(), fonte: "Planilhas IGUATEMI_L*_ENTRADA_OK + Nominatim/OSM (© OpenStreetMap contributors)", pontos }, null, 1));
fs.writeFileSync("data/geocode-pendentes.json", JSON.stringify(pendentes, null, 1));
console.log(`\n${pontos.length} geocodificados, ${pendentes.length} pendentes (data/geocode-pendentes.json). Revise 'precisao: via' e 'cruzamento' antes de usar em produção.`);
