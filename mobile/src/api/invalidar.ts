import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida um conjunto de escopos de uma vez.
 *
 * Substitui `qc.invalidateQueries()` sem argumento, que joga fora o cache
 * inteiro — inclusive o que a ação não tocou.
 */
export function invalidar(qc: QueryClient, escopos: readonly (readonly unknown[])[]): void {
  for (const queryKey of escopos) {
    void qc.invalidateQueries({ queryKey: queryKey as unknown[] });
  }
}
