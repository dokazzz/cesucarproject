/**
 * Regras puras da verificação de aluno: o predicado de gate usado antes de
 * publicar ou reservar uma carona, e os rótulos/tons que as telas mostram.
 * Sem tela, sem fetch — mesma disciplina do resto de `src/domain`.
 */

import type { User, VerificationDocumentType, VerificationStatus } from './types';

/** Gate único: publicar carona e reservar vaga passam por aqui. */
export function estaVerificado(user: Pick<User, 'verification_status'>): boolean {
  return user.verification_status === 'VERIFIED';
}

export const ROTULOS_VERIFICACAO: Record<VerificationStatus, string> = {
  UNVERIFIED: 'Não verificado',
  PENDING: 'Em análise',
  VERIFIED: 'Verificado',
  REJECTED: 'Recusado',
};

export const DESCRICOES_VERIFICACAO: Record<VerificationStatus, string> = {
  UNVERIFIED: 'Confirme seu vínculo com a instituição pra poder publicar e reservar caronas.',
  PENDING:
    'Documento em análise. Publicar e reservar caronas fica bloqueado até sair o resultado.',
  VERIFIED: 'Verificado. Publicar e reservar caronas está liberado.',
  REJECTED: 'O último documento foi recusado. Envie um novo pra tentar de novo.',
};

/** Mesma paleta que `<Etiqueta tom>` aceita — sem importar o componente aqui dentro. */
export type TomVerificacao = 'cinza' | 'aviso' | 'sucesso' | 'perigo';

export const TOM_VERIFICACAO: Record<VerificationStatus, TomVerificacao> = {
  UNVERIFIED: 'cinza',
  PENDING: 'aviso',
  VERIFIED: 'sucesso',
  REJECTED: 'perigo',
};

export const ROTULOS_DOCUMENTO: Record<VerificationDocumentType, string> = {
  STUDENT_ID: 'Carteirinha de estudante',
  ENROLLMENT_PROOF: 'Comprovante de matrícula',
  OTHER: 'Outro documento',
};
