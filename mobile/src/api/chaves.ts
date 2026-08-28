/**
 * Chaves de cache do TanStack Query, num lugar só.
 *
 * Duas razões para centralizar em vez de escrever a string na tela:
 *
 * 1. Invalidar sem erro de digitação. `['meusPedidos']` num arquivo e
 *    `['meus-pedidos']` noutro não dão erro — só param de invalidar, e o
 *    usuário vê dado velho sem ninguém entender por quê.
 * 2. Invalidar por escopo. As chaves são hierárquicas, então invalidar
 *    `chaves.caronas.todas` atinge toda busca de carona sem tocar em perfil
 *    ou notificações.
 */

import type { FiltroCaronas } from '@/domain/carona';

export const chaves = {
  caronas: {
    todas: ['caronas'] as const,
    lista: (filtro: FiltroCaronas) => ['caronas', 'lista', filtro] as const,
    uma: (id: string) => ['caronas', 'uma', id] as const,
    doMotorista: (motoristaId: string) => ['caronas', 'motorista', motoristaId] as const,
  },
  pedidos: {
    todos: ['pedidos'] as const,
    meus: (usuarioId: string) => ['pedidos', 'meus', usuarioId] as const,
    recebidos: (motoristaId: string) => ['pedidos', 'recebidos', motoristaId] as const,
  },
  /**
   * Localização ao vivo. Fica fora de `caronas` de propósito: ela se atualiza
   * sozinha por `refetchInterval`, e se morasse debaixo de `caronas` toda
   * reserva aprovada invalidaria o laço do mapa sem precisar.
   */
  localizacao: {
    todas: ['localizacao'] as const,
    daCarona: (rideId: string) => ['localizacao', rideId] as const,
  },
  notificacoes: {
    todas: ['notificacoes'] as const,
    lista: ['notificacoes', 'lista'] as const,
    naoLidas: ['notificacoes', 'naoLidas'] as const,
  },
} as const;

/**
 * O que invalidar depois de cada ação.
 *
 * Deixar explícito aqui evita as duas saídas ruins: `invalidateQueries()` sem
 * argumento, que rebusca o app inteiro a cada toque, e a lista solta dentro do
 * `onSuccess`, que uma hora esquece a notificação.
 */
export const aposMudanca = {
  /** Reservar ou cancelar vaga: muda a carona, meus pedidos e as notificações. */
  reserva: [chaves.caronas.todas, chaves.pedidos.todos, chaves.notificacoes.todas],
  /** Aprovar ou recusar: muda vagas da carona e as duas pontas do pedido. */
  decisaoDoMotorista: [chaves.caronas.todas, chaves.pedidos.todos, chaves.notificacoes.todas],
  /** Publicar ou cancelar carona: não mexe em notificação de terceiro. */
  carona: [chaves.caronas.todas, chaves.pedidos.todos, chaves.notificacoes.todas],
  /** Marcar lidas: só notificação. */
  notificacoes: [chaves.notificacoes.todas],
} as const;
