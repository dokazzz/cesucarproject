import { describe, expect, it } from 'vitest';

import { estaVerificado } from './verificacao';

describe('estaVerificado', () => {
  it('só é true quando o status é VERIFIED', () => {
    expect(estaVerificado({ verification_status: 'VERIFIED' })).toBe(true);
    expect(estaVerificado({ verification_status: 'UNVERIFIED' })).toBe(false);
    expect(estaVerificado({ verification_status: 'PENDING' })).toBe(false);
    expect(estaVerificado({ verification_status: 'REJECTED' })).toBe(false);
  });
});
