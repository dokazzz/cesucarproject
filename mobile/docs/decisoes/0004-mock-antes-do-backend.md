# 0004 — Construir o app inteiro com dados falsos antes de ligar no backend

**Data:** anterior a 26/08/2026 (registrada retroativamente)
**Quem decidiu:** grupo
**Status:** aceita

## Contexto

O backend (FastAPI) já existe e está no ar. A tentação era ligar o app nele desde a primeira tela.

## Decisão

O v1.0 é um esqueleto navegável completo, com dados falsos na memória. `src/api/client.ts` é a única porta de saída de dados. Trocar mock por API real mexe só nesse arquivo.

## Por quê

Duas razões.

**Demonstração não pode depender de infraestrutura.** Numa apresentação, nada depende de wifi, de servidor no ar, ou de alguém ter deixado o backend rodando. Fechou o app, volta ao estado inicial.

**O grupo precisa ver o produto antes de discutir arquitetura.** É mais fácil discordar de uma tela que existe do que de uma tela imaginada.

## Consequências

- As funções de `client.ts` já são `async` e já devolvem exatamente a forma que a API real devolve. Isso é proposital
- A Sprint 1 é literalmente: abrir `client.ts` e trocar leitura do mock por `fetch`, função por função
- Nenhuma tela sabe de onde os dados vêm. Se alguém fizer `fetch` dentro de uma tela, quebra esse contrato
