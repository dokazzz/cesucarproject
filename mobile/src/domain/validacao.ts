/**
 * Regras de validação puras. Sem tela, sem fetch, sem estado — só entrada e
 * saída. As mesmas regras do backend (schemas/auth.py, schemas/rides.py), pra
 * que o usuário veja o erro antes de gastar uma ida ao servidor.
 */

const RGM_RE = /^\d{8}$/;
/** ABC1234 (antiga) ou ABC1D23 (Mercosul). */
const PLACA_RE = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export type Validacao = { ok: true } | { ok: false; erro: string };

const ok: Validacao = { ok: true };
const falha = (erro: string): Validacao => ({ ok: false, erro });

export function validarRgm(rgm: string): Validacao {
  if (!rgm) return falha('Informe seu RGM.');
  if (!RGM_RE.test(rgm)) return falha('RGM deve conter exatamente 8 dígitos numéricos.');
  return ok;
}

export function validarSenha(senha: string): Validacao {
  if (!senha) return falha('Informe sua senha.');
  if (senha.length < 6) return falha('A senha deve ter pelo menos 6 caracteres.');
  return ok;
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): Validacao {
  if (!confirmacao) return falha('Confirme sua senha.');
  if (senha !== confirmacao) return falha('As senhas não coincidem.');
  return ok;
}

export function validarNome(nome: string): Validacao {
  const limpo = nome.trim();
  if (!limpo) return falha('Informe seu nome completo.');
  if (limpo.length < 3) return falha('Nome muito curto.');
  if (!limpo.includes(' ')) return falha('Informe nome e sobrenome.');
  return ok;
}

/** Remove hífen e espaços, sobe pra maiúscula. Use antes de validar ou salvar. */
export function normalizarPlaca(placa: string): string {
  return placa.replace(/[-\s]/g, '').toUpperCase();
}

export function validarPlaca(placa: string): Validacao {
  if (!placa) return ok; // placa é opcional
  if (!PLACA_RE.test(normalizarPlaca(placa)))
    return falha('Placa inválida. Use ABC1234 (antiga) ou ABC1D23 (Mercosul).');
  return ok;
}

export function validarVagas(vagas: number): Validacao {
  if (!Number.isInteger(vagas)) return falha('Vagas deve ser um número inteiro.');
  if (vagas < 1 || vagas > 8) return falha('Vagas deve ser entre 1 e 8.');
  return ok;
}

export function validarValor(valor: number): Validacao {
  if (Number.isNaN(valor)) return falha('Informe um valor válido.');
  if (valor < 0) return falha('Valor não pode ser negativo.');
  return ok;
}

/** Só dígitos, cortado em 8 — pra usar no `onChangeText` do campo de RGM. */
export function apenasDigitosRgm(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 8);
}

/** (51) 99999-0000 conforme o usuário digita. */
export function formatarTelefone(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
