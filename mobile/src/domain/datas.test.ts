import { afterEach, describe, expect, it, vi } from 'vitest';

import { comoData, hojeISO, isoDeData } from './datas';

afterEach(() => {
  vi.useRealTimers();
});

describe('isoDeData', () => {
  it('usa o fuso local, não UTC', () => {
    // 26/08/2026 às 21:30 no horário de Brasília (UTC-3) é 00:30 do dia 27
    // em UTC. `toISOString().slice(0,10)` devolveria 2026-08-27 — a data de
    // amanhã — e uma carona das 22:40 sumiria do filtro de hoje.
    const noite = new Date(2026, 7, 26, 21, 30, 0);
    expect(isoDeData(noite)).toBe('2026-08-26');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(isoDeData(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('acerta o último instante do dia', () => {
    expect(isoDeData(new Date(2026, 7, 26, 23, 59, 59))).toBe('2026-08-26');
  });
});

describe('hojeISO', () => {
  it('devolve a data local de hoje mesmo à noite', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 26, 22, 40, 0));
    expect(hojeISO()).toBe('2026-08-26');
  });

  it('desloca em dias sem estourar o fim do mês', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 30, 12, 0, 0));
    expect(hojeISO(0)).toBe('2026-08-30');
    expect(hojeISO(1)).toBe('2026-08-31');
    expect(hojeISO(2)).toBe('2026-09-01');
  });
});

describe('comoData', () => {
  it('converte para o formato que o brasileiro lê', () => {
    expect(comoData('2026-08-26')).toBe('26/08/2026');
  });

  it('devolve a entrada intacta se o formato não for o esperado', () => {
    expect(comoData('26/08/2026')).toBe('26/08/2026');
    expect(comoData('')).toBe('');
  });
});
