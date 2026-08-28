import { describe, expect, it } from 'vitest';

import {
  CESUCA_COORD,
  COORDENADAS_CIDADE,
  coordenadaDaCidade,
  distanciaKm,
  interpolar,
  pontosDaRota,
  regiaoQueEnquadra,
} from './geo';
import { CIDADES } from './types';

describe('coordenadaDaCidade', () => {
  it('conhece toda cidade que o app deixa escolher', () => {
    // Se alguém adicionar uma cidade em CIDADES e esquecer do mapa, o pino
    // some sem erro nenhum. Este teste é o que transforma isso em falha.
    for (const cidade of CIDADES) {
      expect(coordenadaDaCidade(cidade), cidade).not.toBeNull();
    }
  });

  it('trata CESUCA como um lugar, não como cidade', () => {
    expect(coordenadaDaCidade('CESUCA')).toEqual(CESUCA_COORD);
  });

  it('devolve null pra cidade que não atendemos', () => {
    expect(coordenadaDaCidade('Florianópolis')).toBeNull();
  });

  it('põe todas as cidades no Rio Grande do Sul', () => {
    // Latitude e longitude trocadas é o erro clássico, e num mapa ele não
    // dá exceção: só joga o pino no meio do Oceano Índico.
    for (const [nome, c] of Object.entries(COORDENADAS_CIDADE)) {
      expect(c.lat, `${nome} lat`).toBeGreaterThan(-31);
      expect(c.lat, `${nome} lat`).toBeLessThan(-29);
      expect(c.lng, `${nome} lng`).toBeGreaterThan(-52);
      expect(c.lng, `${nome} lng`).toBeLessThan(-50);
    }
  });
});

describe('pontosDaRota', () => {
  it('na ida, termina no CESUCA', () => {
    const r = pontosDaRota('Canoas', 'ida');
    expect(r?.origem).toEqual(COORDENADAS_CIDADE['Canoas']);
    expect(r?.destino).toEqual(CESUCA_COORD);
  });

  it('na volta, inverte as pontas', () => {
    const r = pontosDaRota('Canoas', 'volta');
    expect(r?.origem).toEqual(CESUCA_COORD);
    expect(r?.destino).toEqual(COORDENADAS_CIDADE['Canoas']);
  });

  it('devolve null inteiro, não meia rota, pra cidade desconhecida', () => {
    expect(pontosDaRota('Curitiba', 'ida')).toBeNull();
  });
});

describe('interpolar', () => {
  const a = { lat: -30, lng: -51 };
  const b = { lat: -29, lng: -50 };

  it('t=0 é a origem e t=1 é o destino', () => {
    expect(interpolar(a, b, 0)).toEqual(a);
    expect(interpolar(a, b, 1)).toEqual(b);
  });

  it('t=0.5 cai no meio', () => {
    expect(interpolar(a, b, 0.5)).toEqual({ lat: -29.5, lng: -50.5 });
  });

  it('grampeia t fora de 0..1 em vez de passar do destino', () => {
    // Sem o clamp, o carro da demo continuaria andando pra fora do mapa
    // depois da hora de chegada.
    expect(interpolar(a, b, 2)).toEqual(b);
    expect(interpolar(a, b, -5)).toEqual(a);
  });
});

describe('distanciaKm', () => {
  it('é zero pro mesmo ponto', () => {
    expect(distanciaKm(CESUCA_COORD, CESUCA_COORD)).toBe(0);
  });

  it('bate com a distância real entre Cachoeirinha e Porto Alegre', () => {
    // ~13 km em linha reta. Margem larga de propósito: o teste existe pra
    // pegar fórmula errada (que erraria por ordem de grandeza), não pra
    // fixar o número no lugar.
    const d = distanciaKm(
      COORDENADAS_CIDADE['Cachoeirinha']!,
      COORDENADAS_CIDADE['Porto Alegre']!,
    );
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(18);
  });

  it('é simétrica', () => {
    const a = COORDENADAS_CIDADE['Canoas']!;
    const b = COORDENADAS_CIDADE['Viamão']!;
    expect(distanciaKm(a, b)).toBeCloseTo(distanciaKm(b, a), 10);
  });
});

describe('regiaoQueEnquadra', () => {
  it('devolve null pra lista vazia', () => {
    expect(regiaoQueEnquadra([])).toBeNull();
  });

  it('centraliza entre os extremos', () => {
    const r = regiaoQueEnquadra([
      { lat: -30, lng: -52 },
      { lat: -29, lng: -50 },
    ]);
    expect(r?.centro).toEqual({ lat: -29.5, lng: -51 });
  });

  it('abre o suficiente pra caber todo mundo, com folga', () => {
    const r = regiaoQueEnquadra([
      { lat: -30, lng: -52 },
      { lat: -29, lng: -50 },
    ]);
    // Distância real é 1° de lat e 2° de lng; a abertura tem que ser maior.
    expect(r!.deltaLat).toBeGreaterThan(1);
    expect(r!.deltaLng).toBeGreaterThan(2);
  });

  it('não colapsa o zoom quando os pontos coincidem', () => {
    const r = regiaoQueEnquadra([CESUCA_COORD, CESUCA_COORD]);
    expect(r!.deltaLat).toBeGreaterThan(0);
    expect(r!.deltaLng).toBeGreaterThan(0);
  });

  it('enquadra os três pinos de uma carona de verdade', () => {
    const rota = pontosDaRota('Gravataí', 'ida')!;
    const motorista = interpolar(rota.origem, rota.destino, 0.4);
    const r = regiaoQueEnquadra([rota.origem, rota.destino, motorista])!;

    for (const p of [rota.origem, rota.destino, motorista]) {
      expect(Math.abs(p.lat - r.centro.lat)).toBeLessThanOrEqual(r.deltaLat / 2);
      expect(Math.abs(p.lng - r.centro.lng)).toBeLessThanOrEqual(r.deltaLng / 2);
    }
  });
});
