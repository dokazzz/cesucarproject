/**
 * Geografia da carona: coordenadas, enquadramento do mapa e distância.
 *
 * Puro de propósito, igual ao resto de `src/domain`: nada de React, de rede
 * ou de `react-native-maps`. É o que permite testar o cálculo do mapa no
 * Vitest, que não consegue nem carregar um módulo nativo.
 *
 * Por isso o formato aqui é `{ lat, lng }` e não o `{ latitude, longitude }`
 * do `react-native-maps`. A conversão acontece na borda, em `MapaCarona`.
 * O domínio não conhece a biblioteca de mapa, então trocar de biblioteca
 * depois não mexe em nada deste arquivo.
 */

import { CESUCA } from './carona';
import type { Tipo } from './types';

export interface Coordenada {
  lat: number;
  lng: number;
}

/**
 * Campus do CESUCA em Cachoeirinha (Bairro Colinas).
 *
 * APROXIMADO. Foi tirado do bairro, não do endereço exato, e ninguém do grupo
 * conferiu ainda. Serve pra demo; antes de mostrar pra fora, abra o Google
 * Maps no endereço real da faculdade e corrija estes dois números.
 */
export const CESUCA_COORD: Coordenada = { lat: -29.928, lng: -51.087 };

/**
 * Centro aproximado de cada cidade atendida, o mesmo conjunto de `CIDADES`
 * em `types.ts`. É o centro do município, não o endereço do passageiro: o
 * app nunca pediu o endereço de ninguém, e não vai passar a pedir só pra
 * enfeitar o mapa.
 */
export const COORDENADAS_CIDADE: Readonly<Record<string, Coordenada>> = {
  Cachoeirinha: { lat: -29.9469, lng: -51.0939 },
  Gravataí: { lat: -29.9444, lng: -50.9919 },
  Canoas: { lat: -29.9177, lng: -51.1839 },
  Alvorada: { lat: -29.9897, lng: -51.0806 },
  'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
  Viamão: { lat: -30.0811, lng: -51.0233 },
  'Sapucaia do Sul': { lat: -29.8378, lng: -51.145 },
  'São Leopoldo': { lat: -29.7603, lng: -51.1472 },
};

/** `null` para cidade desconhecida. Quem chama decide se esconde o mapa. */
export function coordenadaDaCidade(cidade: string): Coordenada | null {
  if (cidade === CESUCA) return CESUCA_COORD;
  return COORDENADAS_CIDADE[cidade] ?? null;
}

/**
 * As duas pontas da rota, na mesma regra do `rotaDe` de `carona.ts`: um dos
 * lados é sempre o CESUCA. Se a cidade não estiver no mapa, devolve `null`
 * inteiro em vez de meia rota.
 */
export function pontosDaRota(
  cidade: string,
  tipo: Tipo,
): { origem: Coordenada; destino: Coordenada } | null {
  const daCidade = coordenadaDaCidade(cidade);
  if (!daCidade) return null;

  return tipo === 'ida'
    ? { origem: daCidade, destino: CESUCA_COORD }
    : { origem: CESUCA_COORD, destino: daCidade };
}

/** Ponto a `t` do caminho entre `a` e `b`. `t` fora de 0..1 é grampeado. */
export function interpolar(a: Coordenada, b: Coordenada, t: number): Coordenada {
  const f = Math.min(1, Math.max(0, t));
  return {
    lat: a.lat + (b.lat - a.lat) * f,
    lng: a.lng + (b.lng - a.lng) * f,
  };
}

const RAIO_TERRA_KM = 6371;

const emRadianos = (graus: number) => (graus * Math.PI) / 180;

/**
 * Distância em linha reta (haversine), em km.
 *
 * Linha reta, não distância de rua: o carro sempre vai rodar mais que isso.
 * Serve pra dar noção ("o motorista está a ~3 km"), não pra prometer prazo.
 * Rota real exigiria uma API de rotas, que o `MAP-LIVE-TRACKING.md` decidiu
 * não usar nesta versão.
 */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const dLat = emRadianos(b.lat - a.lat);
  const dLng = emRadianos(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(emRadianos(a.lat)) * Math.cos(emRadianos(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Uma região de mapa como centro + abertura, que é como `MapView` pensa.
 * Nomes em `lat`/`lng` pelo mesmo motivo de `Coordenada`: a conversão pro
 * vocabulário da biblioteca fica na borda.
 */
export interface RegiaoMapa {
  centro: Coordenada;
  deltaLat: number;
  deltaLng: number;
}

/**
 * Abertura mínima, em graus. Sem isso, dois pinos quase no mesmo lugar
 * (motorista chegando no destino) abririam o mapa num zoom absurdo, e a tela
 * viraria uma textura cinza sem referência nenhuma. ~0,02° é cerca de 2 km.
 */
const ABERTURA_MINIMA = 0.02;

/** Folga em volta dos pinos, pra nenhum deles encostar na borda do mapa. */
const FOLGA = 1.5;

/**
 * Menor região que mostra todos os pontos de uma vez.
 *
 * Devolve `null` para lista vazia em vez de uma região no meio do oceano:
 * quem chama esconde o mapa, que é mais honesto que mostrar o lugar errado.
 */
export function regiaoQueEnquadra(pontos: readonly Coordenada[]): RegiaoMapa | null {
  const primeiro = pontos[0];
  if (!primeiro) return null;

  let latMin = primeiro.lat;
  let latMax = primeiro.lat;
  let lngMin = primeiro.lng;
  let lngMax = primeiro.lng;

  for (const p of pontos) {
    latMin = Math.min(latMin, p.lat);
    latMax = Math.max(latMax, p.lat);
    lngMin = Math.min(lngMin, p.lng);
    lngMax = Math.max(lngMax, p.lng);
  }

  return {
    centro: { lat: (latMin + latMax) / 2, lng: (lngMin + lngMax) / 2 },
    deltaLat: Math.max(ABERTURA_MINIMA, (latMax - latMin) * FOLGA),
    deltaLng: Math.max(ABERTURA_MINIMA, (lngMax - lngMin) * FOLGA),
  };
}
