// Resolução da URL do geocodificador: build arg vazio não pode virar URL relativa
// (era isso que mandava a busca para /search no próprio domínio no deploy).
import assert from "node:assert/strict";
import { resolverBase } from "../src/lib/geocode.ts";

const PUBLICO = "https://nominatim.openstreetmap.org";
assert.equal(resolverBase(undefined), PUBLICO, "undefined → Nominatim público");
assert.equal(resolverBase(""), PUBLICO, "string vazia (build arg vazio) → Nominatim público");
assert.equal(resolverBase("   "), PUBLICO, "só espaços → Nominatim público");
assert.equal(resolverBase("https://geo.empresa.com/"), "https://geo.empresa.com", "remove barra final");
assert.equal(resolverBase(" https://geo.empresa.com/geocode// "), "https://geo.empresa.com/geocode", "trim + barras");
console.log("geocode: OK");
