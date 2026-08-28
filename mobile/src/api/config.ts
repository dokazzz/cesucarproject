import Constants from 'expo-constants';

import { descrever, montarUrl, resolverOrigem, type Origem } from './origem';

/**
 * A origem dos dados desta execução, resolvida uma vez na abertura.
 *
 * O resto do app importa daqui e nunca lê variável de ambiente direto, para
 * que trocar de backend, ou voltar para o mock numa apresentação, seja mudar
 * o `.env` e reiniciar.
 */
export const origem: Origem = resolverOrigem(Constants.expoConfig?.extra?.apiUrl);

export const usandoMock = origem.tipo === 'mock';

export function url(caminho: string): string {
  return montarUrl(origem, caminho);
}

/** Só para exibir em tela de diagnóstico. Nunca para decidir fluxo. */
export function descricaoDaOrigem(): string {
  return descrever(origem);
}

export type { Origem };
