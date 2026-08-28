# Uroute

**Carona. Conexão. Comunidade.**

App de caronas entre estudantes do Centro Universitário CESUCA, em Cachoeirinha/RS. Todo dia dezenas de alunos saem da mesma cidade, no mesmo horário, para o mesmo lugar, cada um no seu carro ou pegando três ônibus. O Uroute junta essas pessoas.

É a versão mobile do CESUCAR, que hoje existe como site.

[![CI](https://github.com/iagorp6/Uroute/actions/workflows/ci.yml/badge.svg)](https://github.com/iagorp6/Uroute/actions/workflows/ci.yml)

> ### v1.0, esqueleto navegável
>
> O app inteiro funciona, com **dados falsos guardados na memória do aparelho**. Nada aqui fala com servidor ainda.
>
> Isso é de propósito. O v1.0 existe para o grupo abrir no próprio celular e ver como o produto vai parecer e se comportar, antes de qualquer discussão sobre backend, nuvem ou loja. Como consequência, a demonstração funciona em qualquer máquina, sem depender de wifi ou de alguém ter deixado um servidor no ar.

## Rodar

Precisa de **Node.js 20 ou mais novo** e do app **Expo Go** no celular.

```powershell
npm install
npm start
```

Aponte a câmera do Expo Go para o QR code do terminal. O celular e o PC precisam estar na mesma rede. Se o wifi da faculdade bloquear, use `npm run tunnel`.

## Entrar

| RGM        | Senha    | Papel      |
| ---------- | -------- | ---------- |
| `20240001` | `123456` | Passageiro |
| `20240002` | `123456` | Motorista  |

A tela de login preenche cada conta com um toque.

Vale entrar com as duas: a experiência muda. O motorista ganha a aba **Oferecer** e vê as solicitações pendentes; o passageiro não. Dá para trocar de papel no Perfil e ver a aba aparecer na hora.

### Roteiro de dois minutos

1. Como **passageiro**, vá em Procurar, filtre por cidade, abra uma carona e reserve a vaga.
2. Saia, entre como **motorista** (`20240002`), veja a solicitação chegar em Início e confirme.
3. Volte como passageiro. A reserva está confirmada, e o telefone do motorista apareceu.

O passo 3 é o ponto: **contato só aparece depois da aprovação**. Telefone e placa ficam escondidos até existir uma relação que justifique, que é a mesma regra de privacidade do backend.

## O que funciona

Entrar e criar conta, com validação de RGM, senha e placa idêntica à do servidor. Procurar carona por cidade, tipo de viagem, faixa de horário e vagas. Ver detalhe e reservar. Como motorista, publicar rota, calcular o rateio da gasolina, aprovar e recusar pedidos. Acompanhar reservas, ler notificações, editar o perfil e trocar entre passageiro e motorista.

Tema claro e escuro seguindo o sistema, porque muita gente usa o app à noite voltando da aula. Alvo de toque de 44 px e rótulos de leitor de tela no kit inteiro.

**O que não está aqui, de propósito:** backend, nuvem, notificação push e a tela de admin. Quem é admin continua usando o site, que é a decisão que economiza uma sprint inteira.

## Como está organizado

Uma regra por pasta, e cada uma não faz o trabalho das outras.

```
app/            telas e rotas (Expo Router)
src/domain/     regras puras: validação, rateio, filtros, datas
src/api/        a única porta de saída de dados, mais chaves de cache
src/mocks/      os dados falsos do v1.0
src/ui/         botão, campo, cartão, etiqueta, anteparo de erro
src/theme/      cores portadas do CSS do site
```

Três decisões que explicam o resto.

**`src/domain` não importa React, rede nem estilo.** Só lógica pura: validar um RGM, calcular quanto cada um paga de gasolina, filtrar uma lista de caronas. É a parte que dá para testar sem abrir o app, e é onde estão quase todos os testes.

**`src/api/client.ts` é o único lugar que devolve dados.** Nenhuma tela sabe de onde eles vêm. Trocar o mock por HTTP é reescrever corpos de função nesse arquivo, um por vez, com o app funcionando entre cada troca. As duas telas que importam `src/mocks/` fazem isso só para a demonstração, o preenchimento rápido no login e o botão de resetar no perfil, e ambas somem quando a API entrar.

**O app não sabe onde o backend mora.** O endereço vem de variável de ambiente, então trocar de provedor de hospedagem é editar uma linha.

## Apontar para um backend

Sem configuração, o app roda com dados falsos. Para falar com um servidor de verdade, copie `.env.example` para `.env` e defina:

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Reinicie o `npm start` depois de mexer no `.env`.

No emulador de Android use `10.0.2.2` no lugar de `localhost`. Em celular físico, o IP da sua máquina na rede, algo como `192.168.0.12`.

Endereço malformado volta para os dados falsos com um aviso no console, em vez de derrubar o app. Numa apresentação, dado falso é melhor que tela de erro por causa de um typo.

## Contribuir

Ninguém commita direto na `main`. Cria uma branch, abre um pull request, outra pessoa olha antes de juntar.

O `npm install` instala um hook que recusa push direto na `main` e mostra o caminho certo. Ele é um freio, não uma tranca: existe pra avisar quem esqueceu, não pra impedir quem insiste. A tranca de verdade é a proteção de branch do GitHub, e o que falta pra ligar está em [docs/PROTECAO-DA-MAIN.md](docs/PROTECAO-DA-MAIN.md).

Se o hook não disparar, rode `npm install` de novo, ou ligue à mão:

```powershell
git config core.hooksPath .githooks
```

Antes de pedir revisão, rode os três e garanta que passam:

```powershell
npm run typecheck   # erro de tipo
npm run lint        # erro de código, incluindo ordem de hook
npm test            # regras do domínio
```

O CI roda esses três mais formatação e empacotamento Android a cada PR. Se falhar aqui, falha lá, então é mais rápido rodar antes. Formatação o Prettier conserta sozinho com `npx prettier --write .`.

Para instalar biblioteca do Expo, descubra a versão que o nosso SDK espera e instale com o npm direto. O `npx expo install` seria o caminho normal, mas ele falha neste projeto com `EALLOWSCRIPTS` no npm 11, o que está explicado no [ROADMAP](ROADMAP.md#problemas-conhecidos-do-ambiente).

```powershell
node -e "console.log(require('./node_modules/expo/bundledNativeModules.json')['NOME-DO-PACOTE'])"
npm install NOME-DO-PACOTE@VERSAO-QUE-APARECEU
```

## Stack

| Para quê          | Ferramenta                                           |
| ----------------- | ---------------------------------------------------- |
| Base do app       | Expo SDK 57 (React Native 0.86) com TypeScript       |
| Navegação         | Expo Router, com rotas tipadas                       |
| Dados do servidor | TanStack Query                                       |
| Guardar o login   | expo-secure-store (Keychain e Keystore)              |
| Testes            | Vitest, sobre `src/domain`                           |
| Verificação       | ESLint com regras de hooks, Prettier, GitHub Actions |

Expo em vez de Flutter por uma razão prática: ninguém do grupo tem Mac, e com Flutter não dá para rodar o app num iPhone a partir de um PC com Windows. Com Expo Go, quem tem iPhone aponta a câmera para o QR code e o app abre na hora.

## Documentação

| Documento                                                            | Para quê                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **[ROADMAP.md](ROADMAP.md)**                                         | Sprints, o que trava o resto, combinados do time, problemas conhecidos do ambiente |
| **[docs/INFRA.md](docs/INFRA.md)**                                   | Como colocar o backend no ar, passo a passo, para quem nunca fez deploy            |
| **[docs/PROTECAO-DA-MAIN.md](docs/PROTECAO-DA-MAIN.md)**             | Por que ainda dá pra commitar na main, o que freia hoje e o que falta travar       |
| **[docs/MAPA-AO-VIVO.md](docs/MAPA-AO-VIVO.md)**                     | O mapa da carona: o que já funciona, a regra de privacidade e o que falta decidir  |
| [docs/ROADMAP-CESUCAR-ORIGINAL.md](docs/ROADMAP-CESUCAR-ORIGINAL.md) | Documento histórico, de antes de existir código. Superado, guardado por registro   |

---

Projeto de estudantes, para estudantes. Licença MIT, veja [LICENSE](LICENSE).
