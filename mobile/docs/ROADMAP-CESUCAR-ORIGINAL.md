> **Documento histórico.** Este é o roadmap original, escrito quando o app ainda
> se chamava CESUCAR Mobile e antes de existir código. Está superado pelo
> [ROADMAP.md](../ROADMAP.md) na raiz, que é o documento vivo.
>
> Fica aqui porque registra as decisões de partida, principalmente o porquê de
> Expo em vez de Flutter, e porque comparar com o roadmap atual mostra o que
> mudou de ideia no caminho.

# CESUCAR Mobile: por onde a gente começa

Este documento é pro time inteiro. Se você nunca mexeu com desenvolvimento mobile, tudo bem, é pra ser lido do começo ao fim sem pular nada.

## O que vamos construir

Um aplicativo do CESUCAR para Android e iPhone. O site continua existindo e continua funcionando. O app é uma segunda porta de entrada para o mesmo sistema.

O backend (a parte que guarda os dados e faz as regras funcionarem) já está pronto e já está no ar. Não vamos mexer nele por enquanto. Nosso trabalho é construir as telas do app e fazer elas conversarem com esse backend que já existe.

## Por que Expo

Expo é uma ferramenta que deixa a gente escrever o app uma vez, em JavaScript, e gerar as duas versões (Android e iPhone) a partir do mesmo código.

Consideramos Flutter também, que é a alternativa mais forte. Flutter tem performance melhor no papel. O problema é que ninguém do grupo tem Mac, e com Flutter não dá pra rodar o app num iPhone a partir de um PC com Windows. A gente escreveria o código iOS às cegas, esperando 15 minutos por build só pra ver se a tela ficou certa.

Com Expo isso não acontece. Quem tem iPhone instala o app Expo Go, aponta a câmera para um QR code que aparece no PC, e o app abre no celular na hora. Mexeu no código, o celular atualiza sozinho em segundos.

Por isso Expo. Não é que seja melhor em tudo, é que é o único dos dois que a gente consegue realmente desenvolver com o equipamento que temos.

## Stack (as ferramentas que vamos usar)

| Pra quê                                  | Ferramenta                         |
| ---------------------------------------- | ---------------------------------- |
| Base do app                              | Expo (React Native) com TypeScript |
| Navegação entre telas                    | Expo Router                        |
| Buscar e guardar dados do servidor       | TanStack Query                     |
| Guardar o login do usuário com segurança | expo-secure-store                  |
| Notificações no celular                  | expo-notifications                 |
| Gerar o app instalável                   | EAS Build                          |
| Corrigir bug sem esperar a loja aprovar  | EAS Update                         |

Não precisa entender tudo agora. Vai fazendo sentido conforme a gente usa.

## O que cada um precisa instalar

**VS Code.** É onde a gente escreve o código. Depois de instalar, abra a aba de extensões e instale estas três:

```
expo.vscode-expo-tools
dbaeumer.vscode-eslint
esbenp.prettier-vscode
```

**Node.js** (versão 20 ou mais nova). É o que faz o projeto rodar.

**Git.** Pra gente conseguir trabalhar no mesmo código sem se atropelar.

**Android Studio.** Instale, mas não escreva código nele. A gente só usa pelo emulador de Android (um celular falso que roda no PC) e nada mais.

**Xcode: ninguém instala.** Só existe pra Mac. Não precisamos dele.

**No celular**, instale o app **Expo Go** (está na Play Store e na App Store). É por ele que a gente testa o app durante o desenvolvimento.

## Calendário das sprints

| Sprint | Quando        | O que fica pronto                                         |
| ------ | ------------- | --------------------------------------------------------- |
| **0**  | 25/08 a 30/08 | Repositório, contas, projeto criado, login funcionando    |
| **1**  | 31/08 a 04/09 | Telas de login e cadastro completas                       |
| **2**  | 07/09 a 11/09 | Procurar carona: lista, filtros, detalhes, reservar vaga  |
| **3**  | 14/09 a 18/09 | Dashboard: minhas reservas, cancelar, histórico           |
| **4**  | 21/09 a 25/09 | Oferecer carona: publicar rota, aprovar e recusar pedidos |
| **5**  | 28/09 a 02/10 | Perfil, lista de notificações, notificação push           |
| **6**  | 05/10 a 09/10 | Acabamento, imagens das lojas, primeiro teste real        |

**A tela de admin não entra nesta primeira versão do app.** É a tela mais complicada e a que menos gente usa. Quem é admin continua usando o site. Cortar ela economiza uma sprint inteira.

Depois da Sprint 3 a gente já tem um app que funciona de ponta a ponta para passageiro, que é a maioria dos usuários. Se o semestre apertar, dá pra parar ali e ainda ter algo pronto.

## Como funcionam as sprints

Sprint é um ciclo de uma semana. Começa segunda, termina sexta.

**Segunda, 30 minutos.** A gente decide o que entra na semana e quem pega o quê.

**Todo dia, no Slack.** Cada um escreve três linhas: o que fiz ontem, o que vou fazer hoje, se estou travado em alguma coisa. É por escrito mesmo, sem reunião, porque todo mundo tem aula em horário diferente.

**Sexta, 45 minutos.** Mostramos o que ficou pronto e conversamos sobre o que atrapalhou.

Travou em alguma coisa? Fala no mesmo dia. Ficar travado dois dias sem avisar custa muito mais caro pro grupo do que admitir que travou.

## Três coisas urgentes pra Sprint 0

Estas três bloqueiam o resto e não adianta deixar pra depois.

**1. Criar a conta de Apple Developer.** Custa 99 dólares por ano e a aprovação demora dias, às vezes mais de uma semana, porque a Apple verifica identidade. Se isso não começar agora, a Sprint 6 atrasa. É o item mais demorado do projeto inteiro.

**2. Criar o repositório novo no GitHub.** Hoje a gente está passando arquivo ZIP de um pro outro. Com quatro pessoas mexendo no mesmo código, isso vira trabalho sobrescrito na primeira semana.

**3. Descobrir quem tem iPhone.** Sem pelo menos um iPhone no grupo, a gente não consegue testar a versão iOS de jeito nenhum. Se ninguém tiver, lançamos só Android primeiro e resolvemos o iOS depois. Isso é uma decisão de estratégia, não uma derrota, já que a maior parte dos estudantes usa Android mesmo.

Responde essas três no Slack ainda hoje.

## Criando o projeto

O app mobile vai num **repositório separado** do site. São dois projetos diferentes, com códigos diferentes e ritmos diferentes.

Uma pessoa roda os comandos abaixo e depois avisa o grupo. As outras três não precisam repetir, só vão clonar o repositório já pronto.

```powershell
# Cria o projeto
npx create-expo-app@latest cesucar-app --template default
cd cesucar-app

# Instala as bibliotecas que vamos usar
npx expo install expo-secure-store expo-constants expo-router expo-notifications expo-updates
npm install @tanstack/react-query
npm install -D eslint prettier eslint-config-expo

# Cria as pastas onde o código vai ficar organizado
mkdir src\domain, src\api, src\ui, src\hooks

# Sobe pro GitHub
gh repo create cesucar-app --private --source=. --push
```

Se o último comando reclamar que não é um repositório git, rode isto antes dele:

```powershell
git init
git add .
git commit -m "chore: scaffold inicial do app"
```

Depois que subir, os outros três clonam assim:

```powershell
git clone https://github.com/SEU-USUARIO/cesucar-app.git
cd cesucar-app
npm install
```

Uma regra importante: para instalar qualquer biblioteca do Expo, use `npx expo install` e nunca `npm install`. O `expo install` escolhe a versão certa para a nossa versão do Expo. O `npm install` pega sempre a mais recente, que quebra o app de um jeito difícil de descobrir.

## Rodando o app

```powershell
npx expo start
```

Vai aparecer um QR code no terminal. Abra o Expo Go no celular e aponte a câmera. O app abre.

O celular e o PC precisam estar no mesmo wifi. Se não conectar, provavelmente é o wifi da faculdade bloqueando. Nesse caso use:

```powershell
npx expo start --tunnel
```

Testem isso ainda na Sprint 0. Descobrir que o wifi não funciona no meio da Sprint 2 custa caro.

## Quando a Sprint 0 está pronta

Quando alguém conseguir fazer login com um RGM de verdade, num celular de verdade, e o app mostrar o nome da pessoa na tela.

Isso prova que o app conversa com o backend, que o login funciona e que a sessão fica salva. É a base de tudo que vem depois.

## Combinados do time

**Ninguém commita direto na main.** Cria uma branch, faz o trabalho, abre um pull request, outra pessoa olha antes de juntar.

**Antes de abrir o pull request**, rode estes dois comandos e garanta que passam:

```powershell
npx tsc --noEmit
npx eslint .
```

O primeiro procura erro de tipo, o segundo procura código mal escrito. Se algum falhar, conserta antes de pedir revisão.

**Nunca coloque senha, chave ou token dentro do código.** Se precisar de algo assim, fala no grupo que a gente resolve do jeito certo.

**A pasta `src/domain` é especial.** Nela vai só a lógica pura, tipo validar se um RGM tem 8 dígitos ou calcular o rateio da gasolina. Nada de tela, nada de botão. Isso mantém o código organizado e fácil de testar.

---

Documentação técnica do backend, se precisar entender como a API funciona: `docs/TECNICO.md`, no repositório do backend. Não fica neste repositório, que é só do app.
