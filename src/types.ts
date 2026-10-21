export type Precisao = "numero" | "cruzamento" | "via" | "manual";
export interface PontoColeta {
  id: string; nome: string; endereco: string; lat: number; lng: number;
  linhas?: string[]; precisao?: Precisao; resolvidoComo?: string;
}
export interface EnderecoPesquisado { lat: number; lng: number; rotulo: string }
export type Faixa = "verde" | "amarelo" | "fora";
export interface PontoComDistancia extends PontoColeta { distanciaKm: number; faixa: Faixa }
