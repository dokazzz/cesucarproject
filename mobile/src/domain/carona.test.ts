import { describe, expect, it } from 'vitest';

import {
  calcularRateio,
  faixaDoHorario,
  filtrarCaronas,
  formatarValor,
  iniciais,
  rotaDe,
  tipoParaTripType,
  tripTypeParaTipo,
  vagasDisponiveis,
} from './carona';
import type { Ride } from './types';

/** Carona mínima válida; cada teste sobrescreve só o que lhe interessa. */
function carona(over: Partial<Ride> = {}): Ride {
  return {
    id: 'r-1',
    driver_id: 'u-1',
    trip_type: 'GOING_TO_CESUCA',
    departure_city: 'Canoas',
    destination: 'CESUCA',
    departure_time: '2026-09-01T07:20:00',
    available_seats: 4,
    price_per_passenger: 12,
    status: 'ACTIVE',
    tipo: 'ida',
    origem: 'Canoas',
    destino: 'CESUCA',
    data: '01/09/2026',
    horario: '07:20',
    vagas: 4,
    vagas_disp: 4,
    valor: 12,
    driver: 'Bruno Almeida',
    driver_avatar: 'BA',
    course: 'Engenharia Civil',
    driver_institution: 'UFRGS — Universidade Federal do Rio Grande do Sul',
    driver_vehicle_brand: 'Chevrolet',
    driver_vehicle_model: 'Onix',
    driver_vehicle_color: 'Branco',
    vehicle: 'Chevrolet Onix',
    neighborhood: 'Mathias Velho',
    license_plate: null,
    driver_phone: null,
    ...over,
  };
}

describe('calcularRateio', () => {
  it('divide o custo entre passageiros e motorista', () => {
    // 30 km a 10 km/L = 3 L; 3 L x R$6 = R$18.
    const r = calcularRateio(30, 10, 6, 2);
    expect(r).not.toBeNull();
    expect(r!.litros).toBeCloseTo(3);
    expect(r!.custoTotal).toBeCloseTo(18);
    // Dividido por 3 — dois passageiros MAIS o motorista.
    expect(r!.porPassageiro).toBeCloseTo(6);
  });

  it('conta o motorista como pagante, nunca divide só pelos passageiros', () => {
    // Esta é a regra do produto: é rateio de gasolina, não tarifa. Se alguém
    // trocar `passageiros + 1` por `passageiros`, todo mundo paga a mais.
    const r = calcularRateio(30, 10, 6, 2);
    const seFosseTarifa = 18 / 2;
    expect(r!.porPassageiro).not.toBeCloseTo(seFosseTarifa);
    expect(r!.porPassageiro).toBeLessThan(seFosseTarifa);
  });

  it('devolve null em entrada sem sentido em vez de Infinity ou NaN', () => {
    expect(calcularRateio(0, 10, 6, 2)).toBeNull();
    expect(calcularRateio(30, 0, 6, 2)).toBeNull();
    expect(calcularRateio(30, 10, 0, 2)).toBeNull();
    expect(calcularRateio(30, 10, 6, 0)).toBeNull();
    expect(calcularRateio(-30, 10, 6, 2)).toBeNull();
  });
});

describe('rotaDe', () => {
  it('na ida a cidade é origem e o CESUCA é destino', () => {
    expect(rotaDe('Gravataí', 'ida')).toEqual({ origem: 'Gravataí', destino: 'CESUCA' });
  });

  it('na volta inverte', () => {
    expect(rotaDe('Gravataí', 'volta')).toEqual({ origem: 'CESUCA', destino: 'Gravataí' });
  });
});

describe('conversão de tipo de viagem', () => {
  it('ida e volta sobrevivem ao ciclo completo', () => {
    expect(tripTypeParaTipo(tipoParaTripType('ida'))).toBe('ida');
    expect(tripTypeParaTipo(tipoParaTripType('volta'))).toBe('volta');
  });
});

describe('vagasDisponiveis', () => {
  it('nunca devolve número negativo', () => {
    expect(vagasDisponiveis(carona({ vagas_disp: -3 }))).toBe(0);
  });
});

describe('faixaDoHorario', () => {
  it('classifica pelas bordas de cada faixa', () => {
    expect(faixaDoHorario('06:00')).toBe('manha');
    expect(faixaDoHorario('11:59')).toBe('manha');
    expect(faixaDoHorario('12:00')).toBe('tarde');
    expect(faixaDoHorario('17:59')).toBe('tarde');
    expect(faixaDoHorario('18:00')).toBe('noite');
    expect(faixaDoHorario('23:00')).toBe('noite');
  });

  it('devolve null antes das 6h e em horário inválido', () => {
    expect(faixaDoHorario('05:00')).toBeNull();
    expect(faixaDoHorario('xx:00')).toBeNull();
  });
});

describe('formatarValor', () => {
  it('usa vírgula decimal e duas casas', () => {
    expect(formatarValor(8)).toBe('8,00');
    expect(formatarValor(12.5)).toBe('12,50');
    expect(formatarValor(0)).toBe('0,00');
  });
});

describe('iniciais', () => {
  it('pega primeira e última palavra do nome', () => {
    expect(iniciais('Ana Paula Souza')).toBe('AS');
    expect(iniciais('Marina Costa')).toBe('MC');
  });

  it('lida com nome único e com string vazia', () => {
    expect(iniciais('Marina')).toBe('M');
    expect(iniciais('   ')).toBe('CE');
  });
});

describe('filtrarCaronas', () => {
  const lista = [
    carona({
      id: 'a',
      departure_city: 'Canoas',
      tipo: 'ida',
      horario: '07:20',
      valor: 12,
      vagas_disp: 2,
    }),
    carona({
      id: 'b',
      departure_city: 'Alvorada',
      tipo: 'volta',
      horario: '22:40',
      valor: 8,
      vagas_disp: 0,
    }),
    carona({
      id: 'c',
      departure_city: 'Canoas',
      tipo: 'ida',
      horario: '19:00',
      valor: 20,
      vagas_disp: 1,
    }),
  ];

  it('esconde carona cancelada', () => {
    const comCancelada = [...lista, carona({ id: 'd', status: 'CANCELLED' })];
    expect(filtrarCaronas(comCancelada, {}).map((r) => r.id)).not.toContain('d');
  });

  it('filtra por cidade e por tipo', () => {
    expect(filtrarCaronas(lista, { cidade: 'Canoas' }).map((r) => r.id)).toEqual(['a', 'c']);
    expect(filtrarCaronas(lista, { tipo: 'volta' }).map((r) => r.id)).toEqual(['b']);
  });

  it('somenteComVagas remove a lotada', () => {
    expect(filtrarCaronas(lista, { somenteComVagas: true }).map((r) => r.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('ordena por horário por padrão e por preço quando pedido', () => {
    expect(filtrarCaronas(lista, {}).map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(filtrarCaronas(lista, { ordenar: 'preco' }).map((r) => r.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('não modifica o array recebido', () => {
    const original = [...lista];
    filtrarCaronas(lista, { ordenar: 'preco' });
    expect(lista).toEqual(original);
  });
});
