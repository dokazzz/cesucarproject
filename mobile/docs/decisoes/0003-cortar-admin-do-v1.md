# 0003 — Tela de admin fica de fora da primeira versão do app

**Data:** anterior a 26/08/2026 (registrada retroativamente)
**Quem decidiu:** grupo
**Status:** aceita

## Contexto

O sistema web tem tela de administração. A pergunta era se ela entra no app mobile já na primeira versão.

## Alternativas consideradas

| Opção                    | A favor                                                                        | Contra                                                                   |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Incluir admin no app** | App completo, paridade com o site                                              | É a tela mais complexa e a que menos gente usa. Custa uma sprint inteira |
| **Cortar do v1**         | Economiza uma sprint. Foco em passageiro e motorista, que são 99% dos usuários | Admin precisa continuar usando o site                                    |

## Decisão

Admin fica fora. Quem é admin continua usando o site.

## Por quê

É a tela mais complicada e a que menos gente usa. Cortar ela economiza uma sprint inteira — e sprint é o recurso mais escasso do projeto.

## Consequências

- O site precisa continuar no ar e funcionando, não é só legado
- Se o semestre apertar, dá pra parar depois da Sprint 3 e ainda ter um app útil pra passageiro
