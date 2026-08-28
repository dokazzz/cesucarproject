import type { ExpoConfig } from 'expo/config';

import base from './app.json';

/**
 * Configuração dinâmica do app.
 *
 * O `app.json` continua sendo a base estática. Este arquivo só injeta o que
 * depende do ambiente, que hoje é o endereço da API.
 *
 * Sem `EXPO_PUBLIC_API_URL` definida, o app roda com dados falsos, que é o
 * comportamento do v1.0 e o que faz a demonstração funcionar em qualquer
 * máquina. Com a variável definida, ele fala com o backend daquele endereço.
 *
 * Isso mantém a escolha de hospedagem em aberto: trocar de provedor é mudar
 * uma variável de ambiente, não mexer em código.
 */
export default (): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || null;

  return {
    ...(base.expo as ExpoConfig),
    extra: {
      ...(base.expo as ExpoConfig).extra,
      // A chave é omitida quando não há URL, em vez de virar null: o Expo
      // serializa null como {} na configuração pública, o que confunde quem
      // for depurar. Ausente é mais honesto que presente e vazio.
      ...(apiUrl ? { apiUrl } : {}),
    },
  };
};
