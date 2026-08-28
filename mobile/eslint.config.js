const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,

  // Desliga as regras de estilo que brigariam com o Prettier.
  // Tem que vir DEPOIS da config do Expo pra sobrescrever.
  prettier,

  {
    ignores: [
      'dist/*',
      '.expo/*',
      '.expo-check/*',
      'node_modules/*',
      // Copia do projeto web, so referencia visual. Nao e codigo nosso.
      'cesucarproject-main/*',
    ],
  },
]);
