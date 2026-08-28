import { describe, expect, it } from 'vitest';

import {
  apenasDigitosRgm,
  formatarTelefone,
  normalizarPlaca,
  validarConfirmacaoSenha,
  validarNome,
  validarPlaca,
  validarRgm,
  validarSenha,
  validarVagas,
  validarValor,
} from './validacao';

describe('validarRgm', () => {
  it('aceita exatamente 8 dígitos', () => {
    expect(validarRgm('20240001').ok).toBe(true);
  });

  it('recusa tamanho errado, letra e vazio', () => {
    for (const ruim of ['', '2024000', '202400012', '2024000a', 'abcdefgh']) {
      expect(validarRgm(ruim).ok, `deveria recusar ${JSON.stringify(ruim)}`).toBe(false);
    }
  });
});

describe('validarPlaca', () => {
  it('aceita o formato antigo e o Mercosul', () => {
    expect(validarPlaca('ABC1234').ok).toBe(true);
    expect(validarPlaca('ABC1D23').ok).toBe(true);
  });

  it('aceita com hífen e em minúscula, normalizando antes', () => {
    expect(validarPlaca('abc-1234').ok).toBe(true);
    expect(normalizarPlaca('abc-1234')).toBe('ABC1234');
  });

  it('placa é opcional — vazio passa', () => {
    expect(validarPlaca('').ok).toBe(true);
  });

  it('recusa formato inventado', () => {
    for (const ruim of ['AB1234', 'ABCD123', '1234ABC', 'ABC12D3']) {
      expect(validarPlaca(ruim).ok, `deveria recusar ${ruim}`).toBe(false);
    }
  });
});

describe('validarSenha', () => {
  it('exige 6 caracteres', () => {
    expect(validarSenha('12345').ok).toBe(false);
    expect(validarSenha('123456').ok).toBe(true);
  });
});

describe('validarConfirmacaoSenha', () => {
  it('só passa quando as duas batem', () => {
    expect(validarConfirmacaoSenha('123456', '123456').ok).toBe(true);
    expect(validarConfirmacaoSenha('123456', '654321').ok).toBe(false);
    expect(validarConfirmacaoSenha('123456', '').ok).toBe(false);
  });
});

describe('validarNome', () => {
  it('exige nome e sobrenome', () => {
    expect(validarNome('Marina Costa').ok).toBe(true);
    expect(validarNome('Marina').ok).toBe(false);
    expect(validarNome('  ').ok).toBe(false);
  });
});

describe('validarVagas', () => {
  it('aceita de 1 a 8 e recusa fora disso', () => {
    expect(validarVagas(1).ok).toBe(true);
    expect(validarVagas(8).ok).toBe(true);
    expect(validarVagas(0).ok).toBe(false);
    expect(validarVagas(9).ok).toBe(false);
    expect(validarVagas(2.5).ok).toBe(false);
  });
});

describe('validarValor', () => {
  it('recusa negativo e NaN, aceita zero', () => {
    expect(validarValor(0).ok).toBe(true);
    expect(validarValor(-1).ok).toBe(false);
    expect(validarValor(Number.NaN).ok).toBe(false);
  });
});

describe('apenasDigitosRgm', () => {
  it('remove não-dígito e corta em 8', () => {
    expect(apenasDigitosRgm('2024-0001')).toBe('20240001');
    expect(apenasDigitosRgm('202400019999')).toBe('20240001');
    expect(apenasDigitosRgm('abc')).toBe('');
  });
});

describe('formatarTelefone', () => {
  it('formata celular de 11 dígitos', () => {
    expect(formatarTelefone('51998124477')).toBe('(51) 99812-4477');
  });

  it('formata fixo de 10 dígitos', () => {
    expect(formatarTelefone('5133334444')).toBe('(51) 3333-4444');
  });

  it('formata parcialmente enquanto o usuário digita', () => {
    expect(formatarTelefone('5')).toBe('5');
    expect(formatarTelefone('51')).toBe('51');
    expect(formatarTelefone('519')).toBe('(51) 9');
    expect(formatarTelefone('51998')).toBe('(51) 998');
  });

  it('ignora o que passar de 11 dígitos', () => {
    expect(formatarTelefone('519981244779999')).toBe('(51) 99812-4477');
  });
});
