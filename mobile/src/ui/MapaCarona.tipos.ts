/**
 * Props do mapa, num arquivo só.
 *
 * `MapaCarona.tsx` e `MapaCarona.web.tsx` são dois arquivos que o Metro
 * escolhe por plataforma. Se cada um declarasse a própria interface, um dia
 * elas divergiriam e o TypeScript não reclamaria: cada arquivo estaria certo
 * sozinho, e só o web quebraria, que é justamente o que ninguém testa.
 */

import type { Coordenada } from '@/domain/geo';

export interface PropsMapa {
  origem: Coordenada;
  destino: Coordenada;
  /** `null` enquanto a posição não chegou, ou quando não há acesso a ela. */
  motorista: Coordenada | null;
  rotuloOrigem: string;
  rotuloDestino: string;
  /** Frase pronta pra leitor de tela, já que o mapa em si não se descreve. */
  descricao: string;
}
