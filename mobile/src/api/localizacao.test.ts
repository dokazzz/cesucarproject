/**
 * A regra de privacidade da posição ao vivo.
 *
 * Este é o teste mais importante da feature. Saber onde uma pessoa está agora
 * é o dado mais sensível que o app manipula, mais que telefone ou placa, e
 * "esconde na tela" não é proteção: se a resposta traz a coordenada, ela
 * vazou, tendo componente desenhando ou não.
 *
 * Dá pra testar aqui porque `client.ts` não importa nada de React Native, só
 * domínio e mock. Quando a fachada virar `fetch`, este arquivo passa a valer
 * como a especificação que o backend tem que cumprir, e a checagem de
 * verdade migra pra lá (ver docs/MAPA-AO-VIVO.md).
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  ApiError,
  aprovarPedido,
  cancelarCarona,
  localizacaoDaCarona,
  recusarPedido,
  reservarVaga,
} from './client';
import { db, resetarDemo } from '@/mocks/db';
import type { Ride, User } from '@/domain/types';

let carona: Ride;
let passageiro: User;
let motorista: User;
let estranho: User;

beforeEach(() => {
  resetarDemo();
  // Uma carona que a demo ainda não tocou. A primeira do seed já nasce com
  // uma reserva aprovada pro u-1, e partir dela faria o teste medir o seed
  // em vez da regra.
  carona = db.caronas.find(
    (r) =>
      r.status === 'ACTIVE' && r.vagas_disp > 0 && !db.pedidos.some((p) => p.ride_id === r.id),
  )!;
  motorista = db.usuarios.find((u) => u.id === carona.driver_id)!;
  passageiro = db.usuarios.find((u) => u.id === 'u-1')!;
  estranho = db.usuarios.find((u) => u.id !== carona.driver_id && u.id !== 'u-1')!;
});

describe('quem NÃO pode ver a posição', () => {
  it('recusa quem não está logado', async () => {
    await expect(localizacaoDaCarona(carona.id, null)).rejects.toThrow(ApiError);
  });

  it('recusa quem não tem nenhuma relação com a carona', async () => {
    await expect(localizacaoDaCarona(carona.id, estranho.id)).rejects.toThrow(ApiError);
  });

  it('recusa quem pediu mas ainda não foi aprovado', async () => {
    // O ponto do teste: pedir não dá acesso. Se desse, qualquer pessoa
    // rastrearia qualquer motorista só apertando "Reservar".
    await reservarVaga(carona.id, passageiro);
    await expect(localizacaoDaCarona(carona.id, passageiro.id)).rejects.toThrow(ApiError);
  });

  it('recusa quem foi recusado', async () => {
    const pedido = await reservarVaga(carona.id, passageiro);
    await recusarPedido(pedido.id, motorista.id);
    await expect(localizacaoDaCarona(carona.id, passageiro.id)).rejects.toThrow(ApiError);
  });

  it('para de mostrar depois que o passageiro cancela a reserva', async () => {
    const pedido = await reservarVaga(carona.id, passageiro);
    await aprovarPedido(pedido.id, motorista.id);
    expect(await localizacaoDaCarona(carona.id, passageiro.id)).not.toBeNull();

    // Aprovação não é vitalícia: quem sai da carona perde o acesso junto.
    const { cancelarReserva } = await import('./client');
    await cancelarReserva(carona.id, passageiro.id);
    await expect(localizacaoDaCarona(carona.id, passageiro.id)).rejects.toThrow(ApiError);
  });
});

describe('quem pode ver a posição', () => {
  it('libera pro passageiro aprovado', async () => {
    const pedido = await reservarVaga(carona.id, passageiro);
    await aprovarPedido(pedido.id, motorista.id);

    const loc = await localizacaoDaCarona(carona.id, passageiro.id);
    expect(loc).not.toBeNull();
    expect(loc!.ride_id).toBe(carona.id);
    expect(Number.isFinite(loc!.lat)).toBe(true);
    expect(Number.isFinite(loc!.lng)).toBe(true);
  });

  it('libera pro motorista dono da carona', async () => {
    const loc = await localizacaoDaCarona(carona.id, motorista.id);
    expect(loc).not.toBeNull();
  });
});

describe('caronas que não têm posição pra mostrar', () => {
  it('devolve null, não erro, pra carona cancelada', async () => {
    // `null` e não exceção: a carona existe e a pessoa tem direito de ver,
    // só não há viagem acontecendo. A tela esconde o mapa em vez de mostrar
    // "erro ao carregar", que faria parecer defeito.
    await cancelarCarona(carona.id, motorista.id);
    expect(await localizacaoDaCarona(carona.id, motorista.id)).toBeNull();
  });

  it('erra pra carona que não existe', async () => {
    await expect(localizacaoDaCarona('r-inexistente', motorista.id)).rejects.toThrow(ApiError);
  });
});

describe('o caminho da demo', () => {
  it('já começa com o Iago vendo o mapa da primeira carona', async () => {
    // Sem isto, demonstrar o mapa exigiria reservar, sair, entrar como
    // motorista, aprovar e voltar. O seed traz essa reserva pronta, e este
    // teste é o que impede alguém de removê-la sem perceber o que quebrou.
    const primeira = db.caronas[0]!;
    const loc = await localizacaoDaCarona(primeira.id, 'u-1');
    expect(loc).not.toBeNull();
  });

  it('mantém o assento ocupado do seed com dono', async () => {
    // `ocupadas: 1` na primeira carona e a notificação dizendo que a Marina
    // confirmou a vaga só fazem sentido se existir a reserva aprovada.
    const primeira = db.caronas[0]!;
    const aprovadas = db.pedidos.filter(
      (p) => p.ride_id === primeira.id && p.status === 'APPROVED',
    );
    expect(aprovadas).toHaveLength(1);
    expect(primeira.vagas - primeira.vagas_disp).toBe(aprovadas.length);
  });
});
