/**
 * Datas em formato legível.
 *
 * Vive no domínio, não nos mocks: é regra de apresentação do produto, usada
 * por tela de produção. Quando `src/mocks` for apagado na Sprint 1, nada aqui
 * pode ir junto.
 */

/** `YYYY-MM-DD` de hoje, ou de hoje deslocado em dias. */
export function hojeISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return isoDeData(d);
}

/**
 * `YYYY-MM-DD` no fuso local.
 *
 * Não use `toISOString()` aqui: ele converte para UTC antes de cortar, então
 * às 21h em Porto Alegre (UTC-3) devolveria a data de amanhã. Uma carona das
 * 22:40 apareceria no dia errado.
 */
export function isoDeData(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** `YYYY-MM-DD` para `DD/MM/YYYY`, que é como o brasileiro lê. */
export function comoData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}
