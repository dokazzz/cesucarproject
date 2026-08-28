/**
 * De onde os dados vêm, decidido a partir do valor bruto de configuração.
 *
 * Este arquivo não importa nada do Expo nem do React Native de propósito:
 * é o que permite testá-lo no Vitest, que não parseia o Flow do React Native.
 * A leitura da configuração real fica em `config.ts`.
 */

export type Origem = { tipo: 'mock' } | { tipo: 'api'; baseUrl: string };

/** Tira barras do fim para a junção de caminho não gerar `//`. */
function normalizarBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function resolverOrigem(bruto: unknown): Origem {
  if (typeof bruto !== 'string' || bruto.trim() === '') {
    return { tipo: 'mock' };
  }

  const base = normalizarBase(bruto);

  // Endereço malformado vira mock em vez de derrubar o app na abertura: numa
  // apresentação, dado falso é melhor do que tela de erro por causa de typo.
  if (!/^https?:\/\//i.test(base)) {
    console.warn(
      `[Uroute] EXPO_PUBLIC_API_URL inválida (${bruto}). Precisa começar com http:// ou https://. Voltando para dados falsos.`,
    );
    return { tipo: 'mock' };
  }

  return { tipo: 'api', baseUrl: base };
}

/** Monta a URL de um endpoint. `caminho` vem com barra inicial. */
export function montarUrl(origem: Origem, caminho: string): string {
  if (origem.tipo !== 'api') {
    throw new Error('montarUrl() chamada com o app em modo de dados falsos.');
  }
  return `${origem.baseUrl}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}

export function descrever(origem: Origem): string {
  return origem.tipo === 'mock'
    ? 'Dados falsos (nenhuma API configurada)'
    : `API em ${origem.baseUrl}`;
}
