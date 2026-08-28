/**
 * Simulação da posição do motorista, só pra demo.
 *
 * Isto NÃO é regra de produto e morre junto com `src/mocks` na Sprint 1. O
 * backend real não simula nada: ele devolve a última posição que o motorista
 * empurrou de verdade pelo `expo-location`. O que precisa sobreviver à troca
 * é a forma do dado (`LocalizacaoCarona`) e a regra de privacidade em
 * `client.ts`, não o cálculo daqui.
 *
 * A matemática de verdade (interpolar, distância, enquadrar) fica em
 * `src/domain/geo.ts`, que é testada. Aqui só tem a régua do tempo.
 */

import { tripTypeParaTipo } from '@/domain/carona';
import { interpolar, pontosDaRota } from '@/domain/geo';
import type { Coordenada } from '@/domain/geo';
import type { EstadoDaViagem, LocalizacaoCarona, Ride } from '@/domain/types';

/** Quanto antes do horário marcado o motorista começa a se mexer. */
const MINUTOS_ANTES = 15;
/** Quanto tempo a viagem leva, do embarque à chegada. */
const MINUTOS_DE_VIAGEM = 40;

const MS_POR_MINUTO = 60_000;

/**
 * Fração já percorrida da viagem, de 0 a 1.
 *
 * Fora da janela o `interpolar` grampeia sozinho, então antes da hora o carro
 * fica parado na origem e depois fica parado no destino. É o que a gente quer:
 * o mapa nunca fica vazio e nunca mente dizendo que o carro passou do fim.
 */
function progresso(partidaMs: number, agoraMs: number): number {
  const inicio = partidaMs - MINUTOS_ANTES * MS_POR_MINUTO;
  const fim = inicio + MINUTOS_DE_VIAGEM * MS_POR_MINUTO;
  return (agoraMs - inicio) / (fim - inicio);
}

function estadoPor(fracao: number): EstadoDaViagem {
  if (fracao <= 0) return 'NOT_STARTED';
  if (fracao >= 1) return 'COMPLETED';
  return 'IN_TRANSIT';
}

/**
 * Posição simulada do motorista, ou `null` quando a rota não é mapeável.
 *
 * `null` acontece quando a cidade da carona não está em `COORDENADAS_CIDADE`,
 * cidade digitada à mão por exemplo. Quem chama esconde o mapa, que é
 * melhor que plantar um pino no lugar errado.
 */
export function localizacaoSimulada(ride: Ride, agora = new Date()): LocalizacaoCarona | null {
  const rota = pontosDaRota(ride.departure_city, tripTypeParaTipo(ride.trip_type));
  if (!rota) return null;

  const partidaMs = new Date(ride.departure_time).getTime();
  if (Number.isNaN(partidaMs)) return null;

  const fracao = progresso(partidaMs, agora.getTime());
  const ponto: Coordenada = interpolar(rota.origem, rota.destino, fracao);

  return {
    ride_id: ride.id,
    lat: ponto.lat,
    lng: ponto.lng,
    estado: estadoPor(fracao),
    updated_at: agora.toISOString(),
  };
}
