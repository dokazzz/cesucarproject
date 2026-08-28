/**
 * Lógica pura de carona: rateio, vagas, formatação e filtros.
 * Nada aqui importa React ou faz rede — é o que dá pra testar sem abrir o app.
 */

import type { Ride, Tipo, TripType } from './types';

export const CESUCA = 'CESUCA';

export function tipoParaTripType(tipo: Tipo): TripType {
  return tipo === 'ida' ? 'GOING_TO_CESUCA' : 'RETURNING_HOME';
}

export function tripTypeParaTipo(t: TripType): Tipo {
  return t === 'GOING_TO_CESUCA' ? 'ida' : 'volta';
}

export function rotuloTipo(tipo: Tipo): string {
  return tipo === 'ida' ? 'Ida para o CESUCA' : 'Volta do CESUCA';
}

/** Origem e destino derivam do tipo: um dos lados é sempre o CESUCA. */
export function rotaDe(cidade: string, tipo: Tipo): { origem: string; destino: string } {
  return tipo === 'ida'
    ? { origem: cidade, destino: CESUCA }
    : { origem: CESUCA, destino: cidade };
}

export function vagasDisponiveis(ride: Ride): number {
  return Math.max(0, ride.vagas_disp);
}

export function estaLotada(ride: Ride): boolean {
  return vagasDisponiveis(ride) === 0;
}

/** R$ com vírgula decimal, como o site (`CESUCAR.fmt`). */
export function formatarValor(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export interface Rateio {
  custoTotal: number;
  porPassageiro: number;
  litros: number;
}

/**
 * Rateio da gasolina. O motorista também viaja, então o custo é dividido por
 * `passageiros + 1` — cobrar a viagem inteira dos caronas seria lucro, e a
 * proposta do produto é dividir custo, não vender corrida.
 */
export function calcularRateio(
  distanciaKm: number,
  consumoKmPorLitro: number,
  precoPorLitro: number,
  passageiros: number,
): Rateio | null {
  if (distanciaKm <= 0 || consumoKmPorLitro <= 0 || precoPorLitro <= 0 || passageiros < 1) {
    return null;
  }
  const litros = distanciaKm / consumoKmPorLitro;
  const custoTotal = litros * precoPorLitro;
  return {
    litros,
    custoTotal,
    porPassageiro: custoTotal / (passageiros + 1),
  };
}

export type FaixaHorario = 'manha' | 'tarde' | 'noite';

export function faixaDoHorario(horario: string): FaixaHorario | null {
  const h = Number(horario.slice(0, 2));
  if (Number.isNaN(h)) return null;
  if (h >= 6 && h < 12) return 'manha';
  if (h >= 12 && h < 18) return 'tarde';
  if (h >= 18) return 'noite';
  return null;
}

export const ROTULOS_FAIXA: Record<FaixaHorario, string> = {
  manha: 'Manhã (06–12h)',
  tarde: 'Tarde (12–18h)',
  noite: 'Noite (18–23h)',
};

export interface FiltroCaronas {
  cidade?: string;
  data?: string;
  tipo?: Tipo;
  faixa?: FaixaHorario;
  somenteComVagas?: boolean;
  ordenar?: 'horario' | 'preco';
}

/** Aplica o filtro inteiro. Mesma ordem de operações da busca do site. */
export function filtrarCaronas(caronas: Ride[], filtro: FiltroCaronas): Ride[] {
  let lista = caronas.filter((r) => r.status === 'ACTIVE' || r.status === 'FULL');

  if (filtro.cidade) {
    lista = lista.filter((r) => r.departure_city === filtro.cidade);
  }
  if (filtro.data) {
    lista = lista.filter((r) => r.departure_time.slice(0, 10) === filtro.data);
  }
  if (filtro.tipo) {
    lista = lista.filter((r) => r.tipo === filtro.tipo);
  }
  if (filtro.faixa) {
    lista = lista.filter((r) => faixaDoHorario(r.horario) === filtro.faixa);
  }
  if (filtro.somenteComVagas) {
    lista = lista.filter((r) => vagasDisponiveis(r) > 0);
  }

  const ordenado = [...lista];
  if (filtro.ordenar === 'preco') {
    ordenado.sort((a, b) => a.valor - b.valor);
  } else {
    ordenado.sort((a, b) => a.horario.localeCompare(b.horario));
  }
  return ordenado;
}

/** Iniciais pro avatar: "Ana Paula Souza" -> "AS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'CE';
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase() || 'CE';
}
