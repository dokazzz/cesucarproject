import { describe, expect, it, vi } from 'vitest';

import { resolverOrigem } from './origem';

describe('resolverOrigem', () => {
  it('cai no mock quando não há URL configurada', () => {
    for (const vazio of [undefined, null, '', '   ', 42, {}]) {
      expect(resolverOrigem(vazio), `entrada ${JSON.stringify(vazio)}`).toEqual({
        tipo: 'mock',
      });
    }
  });

  it('usa a API quando a URL é válida', () => {
    expect(resolverOrigem('https://api.exemplo.com/api/v1')).toEqual({
      tipo: 'api',
      baseUrl: 'https://api.exemplo.com/api/v1',
    });
  });

  it('aceita http, porque backend local não tem TLS', () => {
    expect(resolverOrigem('http://localhost:8000/api/v1')).toEqual({
      tipo: 'api',
      baseUrl: 'http://localhost:8000/api/v1',
    });
  });

  it('tira barra do fim para não gerar caminho com barra dupla', () => {
    expect(resolverOrigem('https://api.exemplo.com/api/v1///')).toEqual({
      tipo: 'api',
      baseUrl: 'https://api.exemplo.com/api/v1',
    });
  });

  it('ignora espaço em volta, que sobra fácil ao editar .env', () => {
    expect(resolverOrigem('  https://api.exemplo.com  ')).toEqual({
      tipo: 'api',
      baseUrl: 'https://api.exemplo.com',
    });
  });

  it('volta para o mock em URL sem esquema, avisando no console', () => {
    // Numa apresentação, dado falso é melhor do que tela de erro por typo.
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolverOrigem('api.exemplo.com')).toEqual({ tipo: 'mock' });
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
  });

  it('recusa esquema que não é http, como ftp ou javascript', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolverOrigem('ftp://api.exemplo.com')).toEqual({ tipo: 'mock' });
    expect(resolverOrigem('javascript:alert(1)')).toEqual({ tipo: 'mock' });
    aviso.mockRestore();
  });
});
