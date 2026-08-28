# Uroute: por onde a gente começa

Este documento é pro time inteiro. Se você nunca mexeu com desenvolvimento mobile, tudo bem, é pra ser lido do começo ao fim sem pular nada.

## O que é o Uroute

O **Uroute** é a versão para celular do CESUCAR. Mesmo produto, mesma ideia, mesma identidade visual, só que no lugar onde carona de verdade se combina: no corredor, no ponto de ônibus, cinco minutos antes de sair.

O site continua existindo e continua funcionando. O app é uma segunda porta de entrada para o mesmo sistema.

**Por que o nome mudou.** "CESUCAR" é um trocadilho que só funciona escrito, e a marca fica presa a uma instituição só. "Uroute" (de _University_ + _route_) é curto, cabe embaixo de um ícone de app, se pronuncia igual em português e inglês, e não trava o projeto no CESUCA se um dia ele crescer. A identidade visual continua a mesma: azul, laranja, verde, e o mesmo tom de voz.

## Onde estamos agora: v1.0, o esqueleto

**O que já está pronto e roda:** o app inteiro navegável, com dados falsos.

Isso é proposital. O v1.0 existe pra uma coisa só: **o grupo abrir no próprio celular e ver como o produto vai parecer e se comportar**, antes de qualquer discussão sobre backend, nuvem, servidor ou loja.

| Está no v1.0                         | Não está no v1.0 (e não deveria estar) |
| ------------------------------------ | -------------------------------------- |
| Todas as telas, navegáveis           | Backend de verdade                     |
| Login, cadastro, reserva, publicação | Nuvem, servidor, deploy                |
| Dados falsos, na memória do app      | Banco de dados                         |
| Tema claro e escuro                  | Notificação push                       |
| Regras de validação reais            | Conta de loja, build de produção       |

Os dados vivem na memória enquanto o app está aberto. Fechou, volta ao estado inicial. Numa demonstração isso é vantagem: nada depende de wifi, de servidor no ar, ou de alguém ter deixado o backend rodando.

### Como rodar

Você precisa de **Node.js 20 ou mais novo** e do app **Expo Go** no celular (Play Store ou App Store).

```powershell
npm install
npm start
```

Vai aparecer um QR code no terminal. Abra o Expo Go e aponte a câmera. O app abre no seu celular.

O celular e o PC precisam estar no mesmo wifi. Se o wifi da faculdade bloquear, use:

```powershell
npm run tunnel
```

**Testem isso na primeira semana.** Descobrir que o wifi não funciona no meio de uma sprint custa caro.

### Contas para testar

Já vêm prontas, e a tela de login tem um botão pra preencher cada uma com um toque:

| RGM        | Senha    | Papel      |
| ---------- | -------- | ---------- |
| `20240001` | `123456` | Passageiro |
| `20240002` | `123456` | Motorista  |

Entre com as duas. A experiência muda: o motorista ganha a aba "Oferecer" e vê as solicitações pendentes; o passageiro não. Dá pra trocar de papel no Perfil e ver a aba aparecer na hora.

**Roteiro de 2 minutos pra mostrar pro grupo:**

1. Entre como **passageiro**, vá em Procurar, filtre por cidade, abra uma carona e reserve a vaga.
2. Saia, entre como **motorista** (`20240002`), veja a solicitação chegar em Início e confirme.
3. Volte como passageiro: a reserva agora aparece confirmada, e o telefone do motorista apareceu.

Esse último passo é o ponto: **contato só aparece depois da aprovação.** É a regra de privacidade do backend, e o app já a respeita.

## Por que Expo

Expo deixa a gente escrever o app uma vez, em TypeScript, e gerar as duas versões (Android e iPhone) do mesmo código.

Consideramos Flutter, que é a alternativa mais forte e tem performance melhor no papel. O problema é que ninguém do grupo tem Mac, e com Flutter não dá pra rodar o app num iPhone a partir de um PC com Windows. A gente escreveria o código iOS às cegas, esperando 15 minutos por build só pra ver se a tela ficou certa.

Com Expo isso não acontece. Quem tem iPhone instala o Expo Go, aponta a câmera pro QR code, e o app abre no celular na hora. Mexeu no código, o celular atualiza sozinho em segundos.

Não é que Expo seja melhor em tudo. É que é o único dos dois que a gente consegue realmente desenvolver com o equipamento que tem.

## Stack

| Pra quê                            | Ferramenta                                   | Já está no v1.0?  |
| ---------------------------------- | -------------------------------------------- | ----------------- |
| Base do app                        | Expo SDK 57 (React Native 0.86) + TypeScript | sim               |
| Navegação entre telas              | Expo Router, com rotas tipadas               | sim               |
| Buscar e guardar dados do servidor | TanStack Query                               | sim               |
| Guardar o login com segurança      | expo-secure-store                            | sim               |
| Endereço da API por ambiente       | `EXPO_PUBLIC_API_URL`                        | sim               |
| Testes das regras puras            | Vitest                                       | sim               |
| Lint, formatação e CI              | ESLint, Prettier, GitHub Actions             | sim               |
| Notificações no celular            | expo-notifications                           | não, Sprint 5     |
| Gerar o app instalável             | EAS Build                                    | não, Sprint 5 e 6 |
| Corrigir bug sem esperar a loja    | EAS Update                                   | não, Sprint 6     |

Não precisa entender tudo agora. Vai fazendo sentido conforme a gente usa.

## Como o código está organizado

A regra é uma só: **cada pasta tem um trabalho, e não faz o trabalho das outras.**

```
app/                    telas e rotas (o arquivo vira a URL)
  (auth)/               login e cadastro
  (app)/                as 4 abas de quem está logado
  carona/[id].tsx       detalhe da carona
src/
  domain/               regras puras, sem tela nem rede
  api/client.ts         a ÚNICA porta de saída de dados
  mocks/db.ts           os dados falsos do v1.0
  session/              quem está logado
  theme/                cores e espaçamentos
  ui/                   botão, campo, cartão, etiqueta
```

Três coisas que valem entender:

**`src/domain` é sagrado.** Só lógica pura: validar se um RGM tem 8 dígitos, calcular o rateio da gasolina, filtrar uma lista de caronas. Nada de tela, nada de botão, nada de `fetch`. É a parte que dá pra testar sem abrir o app.

**`src/api/client.ts` é o único ponto que fala com dados.** Nenhuma tela sabe de onde os dados vêm. Hoje vêm do mock; quando o backend entrar, a gente troca o corpo dessas funções por `fetch` e **nenhuma tela precisa mudar**. Por isso elas já são `async` e já devolvem exatamente a forma que a API real devolve.

**`src/ui` é o kit de peças.** Se você precisa de um botão, use `<Botao>`. Não escreva um `Pressable` com cor na mão, porque é assim que o app começa a parecer cinco apps diferentes.

### As cores são as do CESUCAR

Portadas direto do `css/style.css` do site, mesmos hex:

| Cor      | Hex       | Uso                                     |
| -------- | --------- | --------------------------------------- |
| Azul     | `#0f4c81` | Cor principal. Confiança, instituição   |
| Laranja  | `#e85d24` | Destaque e ação. Os botões que importam |
| Verde    | `#2f9e83` | Confirmado, aprovado, deu certo         |
| Amarelo  | `#f4b942` | Atenção, pendente, aguardando           |
| Vermelho | `#dc4c4c` | Cancelado, erro                         |

Tema claro e escuro, seguindo o sistema do celular, porque muita gente usa o app à noite voltando da aula.

### O tom de voz continua o mesmo

| Assim                       | Não assim                           |
| --------------------------- | ----------------------------------- |
| "Sua vaga foi confirmada"   | "Requisição processada com sucesso" |
| "Esta carona já está cheia" | "Erro 409: capacidade excedida"     |
| "Você"                      | "O usuário"                         |

Se um calouro não entender a frase, a frase está errada.

## Calendário das sprints

| Sprint | Quando        | O que fica pronto                                                          |
| ------ | ------------- | -------------------------------------------------------------------------- |
| **0**  | 25/08 a 30/08 | ~~Telas navegáveis, testes, CI, acessibilidade~~ **feito, antes do prazo** |
| **1**  | 31/08 a 04/09 | Backend no ar na conta do grupo, login de verdade substituindo o mock      |
| **2**  | 07/09 a 11/09 | Procurar carona ligada na API, com paginação                               |
| **3**  | 14/09 a 18/09 | Dashboard e reservas na API                                                |
| **4**  | 21/09 a 25/09 | Oferecer carona, aprovar e recusar na API                                  |
| **5**  | 28/09 a 02/10 | Perfil, notificações e push                                                |
| **6**  | 05/10 a 09/10 | Acabamento, ícones, EAS Build, primeiro teste real                         |

**A tela de admin não entra nesta primeira versão.** É a mais complicada e a que menos gente usa. Quem é admin continua usando o site. Cortar ela economiza uma sprint inteira.

Depois da Sprint 3 já temos um app que funciona de ponta a ponta pra passageiro, que é a maioria dos usuários. Se o semestre apertar, dá pra parar ali e ainda ter algo pronto.

### Sprint 1 em detalhe: trocar o mock pela API

É a única sprint que precisa de explicação, porque é onde o v1.0 vira v1.1.

O backend já existe e já está no ar (`backend/` do projeto web, FastAPI). Os endpoints que a gente precisa já estão prontos:

| O que o app precisa    | Endpoint                                         |
| ---------------------- | ------------------------------------------------ |
| Entrar                 | `POST /api/v1/auth/login`                        |
| Criar conta            | `POST /api/v1/auth/register`                     |
| Buscar caronas         | `GET /api/v1/rides`                              |
| Reservar vaga          | `POST /api/v1/rides/{id}/request`                |
| Minhas reservas        | `GET /api/v1/my-requests`                        |
| Solicitações recebidas | `GET /api/v1/my-ride-requests`                   |
| Aprovar                | `POST /api/v1/rides/{id}/requests/{req}/approve` |
| Notificações           | `GET /api/v1/notifications`                      |

O trabalho é abrir `src/api/client.ts` e, função por função, trocar a leitura do mock por um `fetch`. **Use `/api/v1`, não `/api`.** A versão sem número devolve uma lista crua só pra não quebrar o site antigo; a `v1` devolve `{items, next_cursor, has_more}`, que é o que a gente quer pra paginar.

Dá pra fazer uma função por vez. Enquanto uma já usa a API, as outras seguem no mock e o app continua funcionando.

## O que trava o resto

Nenhum destes é difícil. Todos são demorados ou dependem de outra pessoa, que é por que precisam começar agora e não quando chegar a sprint deles.

**1. GitHub Student Developer Pack: aprovado, aguardando os benefícios sincronizarem.** É o que paga a hospedagem do backend e o que dá GitHub Pro, que liga a proteção da `main` sem precisar abrir o repositório. Nada a fazer além de esperar. Pra saber se já valeu, rode `bash scripts/proteger-main.sh`: ele avisa se o Pro ainda não chegou, e aplica a proteção sozinho quando chegar. Detalhes em [docs/INFRA.md](docs/INFRA.md) e [docs/PROTECAO-DA-MAIN.md](docs/PROTECAO-DA-MAIN.md).

**2. Decidir de onde vem o código do backend.** Ele está hoje no projeto de um colega, e deploy precisa de repositório. Ou ele cria um repositório próprio para o backend, ou dá acesso ao dele. É conversa de grupo, não questão técnica, porque o trabalho é dele.

**3. Criar a conta de Apple Developer.** Custa 99 dólares por ano e a aprovação demora dias, às vezes mais de uma semana, porque a Apple verifica identidade. Se não começar agora, a Sprint 6 atrasa.

**4. Descobrir quem tem iPhone.** Sem pelo menos um iPhone no grupo, não dá pra testar a versão iOS. Se ninguém tiver, lançamos só Android primeiro e resolvemos o iOS depois. É decisão de estratégia, não derrota, já que a maior parte dos estudantes usa Android mesmo.

**5. Decidir se o motorista pode fechar o app durante a carona.** O mapa da carona já está no app do lado do passageiro, mas o motorista só passa a enviar a posição depois que isto for decidido. Deixar o app aberto durante a viagem evita a permissão de localização em background e a justificativa que a Apple exige na revisão. É decisão de produto, e o raciocínio inteiro está em [docs/MAPA-AO-VIVO.md](docs/MAPA-AO-VIVO.md).

**6. Todo mundo rodar o app essa semana.** Clonar, `npm install`, `npm start`, abrir no celular. Quem travar, fala no grupo no mesmo dia.

## Problemas conhecidos do ambiente

Três tropeços que já apareceram na montagem do projeto. Se você bater neles, não é bug do app.

**`npx expo install` falha com `EALLOWSCRIPTS`.** Acontece no npm 11+. O Expo passa uma flag que o npm novo não aceita mais dentro de um projeto. Contorno: descubra a versão certa e instale com o npm direto.

```powershell
# mostra a versao compativel com a nossa versao do Expo
node -e "console.log(require('./node_modules/expo/bundledNativeModules.json')['NOME-DO-PACOTE'])"
npm install NOME-DO-PACOTE@VERSAO-QUE-APARECEU
```

**`npm install` reclama de `react-dom`.** O `expo-router` puxa `react-dom` 19.2.8 por transitividade, que exige `react ^19.2.8`, mas o Expo SDK 57 fixa `react` em 19.2.3. Já está resolvido: o `package.json` tem um bloco `overrides` fixando `react-dom` em 19.2.3. **Não remova esse bloco:** sem ele, nenhuma instalação nova passa.

**Expo Go diz que a versão não é compatível.** A mensagem vem assim:

```
Client version: 1017756
Supported SDK: 54
```

O projeto é SDK 57, então o Expo Go recusa. Antes de mexer em qualquer coisa do projeto, **confira a versão do seu iOS**. A App Store entrega a versão mais nova do Expo Go _compatível com o seu sistema_: num iPhone com iOS antigo, você recebe um Expo Go antigo, ele aparece como atualizado, e não é o mais recente que existe. Atualizar o iOS resolve sem tocar em uma linha de código.

Não tente fazer o projeto atender dois SDKs. Não existe: o Expo Go lê o `runtimeVersion` do manifesto, que é um só. A alternativa seria descer o projeto inteiro de 57 para 54, o que troca Expo, React Native, React, Reanimated e Expo Router de uma vez, e é caro demais para contornar um sistema desatualizado.

Enquanto o celular não estiver disponível, dá pra ver o app inteiro no navegador com `npm run web` e a emulação de dispositivo do navegador (F12, depois Ctrl+Shift+M). Só o mapa aparece como texto ali, porque `react-native-maps` embrulha o mapa nativo e não existe na web.

**O celular não acha o servidor.** Quase sempre é uma destas três, nesta ordem: o firewall do Windows bloqueia a porta 8081 na entrada e precisa de uma regra criada como administrador; a rede é institucional e isola os aparelhos entre si, e aí a saída é ligar o hotspot do celular e conectar o notebook nele; ou o Expo Go está sem a permissão de **Rede local** nos ajustes do iPhone, e nesse caso ele nunca lista servidor nenhum.

```powershell
# no PowerShell como administrador, uma vez por maquina
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any
```

O `-Profile Any` importa: o Windows costuma classificar Wi-Fi como rede pública, e regra de perfil privado não valeria.

O modo `--tunnel`, que contornaria firewall e rede, **não funciona em rede que bloqueia o ngrok**. Pra saber se é o caso, `curl https://connect.ngrok-agent.com`: se responder `000`, a rede está bloqueando e não adianta insistir.

## Como funcionam as sprints

Sprint é um ciclo de uma semana. Começa segunda, termina sexta.

**Segunda, 30 minutos.** A gente decide o que entra na semana e quem pega o quê.

**Todo dia, por escrito.** Cada um manda três linhas: o que fiz ontem, o que vou fazer hoje, se estou travado. Por escrito mesmo, sem reunião, porque todo mundo tem aula em horário diferente.

**Sexta, 45 minutos.** Mostramos o que ficou pronto e conversamos sobre o que atrapalhou.

Travou? Fala no mesmo dia. Ficar travado dois dias sem avisar custa muito mais caro pro grupo do que admitir que travou.

## Combinados do time

**Ninguém commita direto na main.** Cria uma branch, faz o trabalho, abre um pull request, outra pessoa olha antes de juntar.

Isso deixa de ser combinado e passa a ser regra quando a proteção de branch for ligada, o que exige repositório público **ou** GitHub Pro. O Pro vem de graça no GitHub Student Developer Pack, então dá para proteger a `main` sem abrir o código. Em qualquer um dos casos, rode `bash scripts/proteger-main.sh` uma vez. A partir daí a `main` só aceita merge por PR com CI verde e uma aprovação, e força bruta não passa.

Como colocar o backend no ar, e por que Heroku pelo Student Pack em vez de plano gratuito: [docs/INFRA.md](docs/INFRA.md).

**Antes de abrir o pull request**, rode os três e garanta que passam:

```powershell
npm run typecheck   # erro de tipo
npm run lint        # erro de código, incluindo ordem de hook
npm test            # regras do domínio
```

O CI roda esses três no GitHub, mais formatação e empacotamento Android.
Se falhar aqui, falha lá, então é mais rápido rodar antes de abrir o PR.

Formatação fora do padrão o Prettier conserta sozinho:

```powershell
npx prettier --write .
```

Se algum falhar, conserta antes de pedir revisão.

**Pra instalar biblioteca do Expo, use `npx expo install`, nunca `npm install`.** O `expo install` escolhe a versão certa pra nossa versão do Expo. O `npm install` pega a mais recente, que quebra o app de um jeito difícil de descobrir.

**Nunca coloque senha, chave ou token dentro do código.** Se precisar de algo assim, fala no grupo que a gente resolve do jeito certo.

---

Documentação técnica do backend: fica no `docs/TECNICO.md` do projeto web original do CESUCAR, que **não está neste repositório**. A pasta `cesucarproject-main/` está no `.gitignore`, então quem tem o projeto antigo baixado ao lado enxerga o arquivo e quem clonou só o Uroute não enxerga.

Quando o repositório do backend for resolvido, que é o item 2 de "O que trava o resto", esse documento ganha um endereço de verdade e entra aqui como link.
