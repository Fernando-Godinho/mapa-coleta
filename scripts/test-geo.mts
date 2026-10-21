// Teste dos cálculos geodésicos: raios reais de 1 km e 2,5 km, anel com furo, classificação.
import assert from "node:assert/strict";
import { coberturaGeoJSON, distanciaKm, faixaExibida } from "../src/lib/geo.ts";

const p = { id: "t", nome: "t", endereco: "t", lat: -30.0277, lng: -51.2287 };
const { verde, amarelo } = coberturaGeoJSON([p]);
for (const [coords, esperado] of [[verde.features[0].geometry.coordinates[0], 1], [amarelo.features[0].geometry.coordinates[0], 2.5]] as const)
  for (const [lng, lat] of coords) assert.ok(Math.abs(distanciaKm(p, { lat, lng }) - esperado) < 0.005, `raio ${esperado} km`);
assert.equal(amarelo.features[0].geometry.coordinates.length, 2, "anel tem furo");
assert.equal(faixaExibida(1.004), "verde"); assert.equal(faixaExibida(1.006), "amarelo");
assert.equal(faixaExibida(2.5), "amarelo"); assert.equal(faixaExibida(2.51), "fora");
console.log("geo: OK");
