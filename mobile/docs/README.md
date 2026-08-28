# docs/ — documentação do uRoute

Aqui fica tudo que não é código: o que a gente decidiu, por que decidiu, o que o produto faz e o que a pesquisa com alunos precisa.

## O que tem em cada pasta

| Onde            | O que é                                                               | Quem mexe                          |
| --------------- | --------------------------------------------------------------------- | ---------------------------------- |
| `diario/`       | Uma ata por semanal. Data, presentes, decisões, quem levou o quê      | Luiz Gustavo escreve, todos leem   |
| `decisoes/`     | Uma decisão por arquivo, numerada. Alternativas consideradas e motivo | Quem tomou a decisão, ou LT na ata |
| `requisitos.md` | O que o produto faz, para quem, com que regra                         | Todos, via pull request            |
| `etica/`        | Protocolo, TCLE, questionário, comprovantes do comitê                 | Luiz Gustavo + Samuel              |
| `identidade/`   | Missão, visão, valores, manual de marca                               | Todos                              |

## Documentos técnicos

Estes são sobre como o app funciona e como mexer nele, não sobre o processo do grupo. Ficam soltos aqui na raiz da pasta.

| Arquivo                                                      | O que é                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`INFRA.md`](INFRA.md)                                       | Como colocar o backend no ar, passo a passo, para quem nunca fez deploy          |
| [`MAPA-AO-VIVO.md`](MAPA-AO-VIVO.md)                         | O mapa da carona: o que já funciona, a regra de privacidade, o que falta decidir |
| [`PROTECAO-DA-MAIN.md`](PROTECAO-DA-MAIN.md)                 | Por que ainda dá pra commitar direto na `main` e o que falta pra travar          |
| [`ROADMAP-CESUCAR-ORIGINAL.md`](ROADMAP-CESUCAR-ORIGINAL.md) | Documento histórico, de antes de existir código. Superado, guardado por registro |

## As duas regras

**1. Decisão que não está na ata não foi tomada.**
Combinou na semanal? Vira ata em até 24h. Sem isso, daqui a três semanas ninguém lembra se ficou decidido usar Mapbox ou Google Maps, e a discussão volta do zero.

**2. Decisão técnica que muda o rumo vira arquivo em `decisoes/`.**
Não é toda escolha. É a que alguém vai questionar depois: "por que Expo e não Flutter?", "por que cortamos o admin?". Se a resposta demora mais de um minuto pra explicar, documenta.

## Como escrever uma ata

Copie `diario/TEMPLATE.md`, renomeie pra data (`2026-09-02.md`), preencha. Cinco minutos, não meia hora.

## Como escrever uma decisão

Copie `decisoes/TEMPLATE.md`, use o próximo número livre. O importante não é o que a gente escolheu — é **o que a gente descartou e por quê.**
