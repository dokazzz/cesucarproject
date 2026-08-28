# 0005 — Segurança de passageira mulher é requisito de produto, não só pergunta de pesquisa

**Data:** 26/08/2026
**Quem levantou:** Samuel Rosa
**Status:** proposta — precisa de decisão do grupo

## Contexto

Na semanal de 26/08, ao discutir como abordar os alunos pra divulgar o uRoute, Samuel apontou: a maioria dos alunos do CESUCA é mulher, e entrar no carro de um aluno homem desconhecido é uma barreira real de adoção.

O roadmap não tem nenhum item sobre isso.

## Por que isso importa mais do que parece

O produto já tem uma resposta parcial: **é fechado por RGM.** Não é um estranho da internet, é um colega de faculdade. E toda reserva passa por aprovação do motorista.

Mas isso resolve a segurança do motorista, não a da passageira. Quem aprova é quem dirige. Quem entra no carro não escolhe nada além de aceitar ou não.

Se essa barreira for real e a gente não tratar, o app é adotado por uma fração dos alunos e a tese do projeto não se sustenta.

## Alternativas a discutir

| Opção                                          | A favor                                         | Contra                                                                         |
| ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| **Filtro/preferência de gênero na busca**      | Direto ao ponto, comum em apps do tipo          | Precisa cuidado jurídico e de discriminação. Exige campo de gênero no cadastro |
| **Avaliação pós-viagem visível**               | Constrói reputação ao longo do tempo            | Não ajuda no primeiro uso, que é justamente onde a barreira está               |
| **Passageira também aprova antes de embarcar** | Simétrico. Baixo custo de implementação         | Mais fricção no fluxo                                                          |
| **Perfil mais rico (foto, curso, semestre)**   | Reduz a sensação de "estranho" sem criar filtro | Mais dado pessoal, mais peso de LGPD                                           |
| **Não fazer nada no v1**                       | Foco                                            | Se a barreira for real, custa adoção                                           |

## O que falta pra decidir

Isso é exatamente o que a pesquisa com alunos deve medir. Vira bloco do questionário no protocolo de ética.

**Não decidir agora.** Decidir com dado, depois da aprovação do comitê. Mas registrar agora, pra não esquecer.

## Consequências

- Entra como bloco no instrumento de coleta (`etica/`)
- Se alguma opção for adotada, provavelmente exige campo novo no cadastro e mudança no backend, não só no app
