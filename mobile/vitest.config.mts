import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mesmo apelido do tsconfig, senão os imports '@/...' não resolvem.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Só o domínio por enquanto: função pura, sem ambiente nativo, roda em
    // segundos. Teste de componente exige React Native Testing Library e é
    // uma decisão separada.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
