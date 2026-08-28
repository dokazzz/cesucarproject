# 0001 — Expo (React Native) em vez de Flutter

**Data:** anterior a 26/08/2026 (registrada retroativamente)
**Quem decidiu:** grupo
**Status:** aceita

## Contexto

O app precisa rodar em Android e iPhone. Escrever duas vezes, em Kotlin e Swift, está fora de cogitação pro tamanho do time e do prazo. Então: qual framework multiplataforma?

## Alternativas consideradas

| Opção                   | A favor                                                                                        | Contra                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Flutter**             | Performance melhor no papel, UI muito consistente                                              | Não dá pra rodar em iPhone a partir de um PC Windows. Build de iOS exige Mac |
| **Expo (React Native)** | Roda no iPhone via Expo Go, sem Mac. Hot reload em segundos. TypeScript, que o time já entende | Performance um pouco abaixo do Flutter                                       |

## Decisão

Expo com React Native e TypeScript.

## Por quê

**Ninguém do grupo tem Mac.** Com Flutter, a gente escreveria o código iOS às cegas, esperando build de 15 minutos só pra descobrir se a tela ficou certa.

Com Expo, quem tem iPhone instala o Expo Go, aponta a câmera pro QR code, e o app abre na hora. Mexeu no código, o celular atualiza sozinho.

Não é que Expo seja melhor em tudo. É o único dos dois que a gente consegue realmente desenvolver com o equipamento que tem.

## Consequências

- Ficamos dependentes do ecossistema Expo (EAS Build, EAS Update)
- Instalação de biblioteca tem que ser com `npx expo install`, nunca `npm install` — o expo escolhe a versão compatível
- Se a performance virar problema em alguma tela específica, resolvemos ali, não trocando de framework
