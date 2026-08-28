# Proteção da main

Por que ainda dá pra commitar direto na `main`, o que já freia isso hoje, e o
que falta pra travar de verdade.

## O que aconteceu

Em 27/08 entrou um commit direto na `main`, sem pull request. O conteúdo era
bom, documentação que o professor pediu, e o problema não foi quem empurrou:
não havia nada impedindo, e nada avisando na hora.

O README já dizia "ninguém commita direto na main" desde o começo. Escrever a
regra não bastou, e não ia bastar mesmo. Regra que depende de todo mundo
lembrar é regra que uma hora falha, e falha justo no dia corrido.

O custo não é teórico. Já entrou um `package-lock.json` fora de sincronia por
essa mesma porta, o `npm ci` passou a recusar, e todos os pull requests
ficaram travados por um dia até alguém descobrir. Pull request com CI verde
teria pego isso antes de encostar na `main`.

## Por que a proteção não está ligada

Não é esquecimento. O GitHub recusa:

    $ gh api repos/iagorp6/Uroute/rulesets
    Upgrade to GitHub Pro or make this repository public
    to enable this feature. (HTTP 403)

Proteção de branch e ruleset são recursos pagos em repositório privado. O
nosso é privado, em conta free. Então hoje é literalmente impossível ligar,
não importa quantos scripts a gente escreva.

Também não adianta mexer na permissão dos colaboradores. Todo mundo hoje tem
`push`, que é o mínimo pra conseguir subir uma branch e abrir pull request.
Rebaixar pra `triage` tira o push da `main` e o de todas as outras branches
junto, o que obrigaria o time a trabalhar com fork. Sem proteção de branch,
não existe meio-termo.

## O caminho escolhido

O GitHub Student Developer Pack **já foi aprovado**. Falta os benefícios
sincronizarem na conta, o que é espera, não tarefa. Quando o GitHub Pro
estiver ativo, proteção de branch passa a funcionar em repositório privado e
a tranca liga sem precisar abrir o código.

Foi por isso que a gente não tornou o repositório público, que era a outra
saída possível. Ela é grátis e ligaria hoje, mas o repositório deixou de ser
só código: agora tem ata nomeando o grupo inteiro e o rascunho do
questionário de pesquisa, que diz na primeira linha para não aplicar antes da
aprovação do comitê de ética. Publicar um instrumento de coleta antes do
comitê olhar não é efeito colateral aceitável de uma decisão sobre permissão
de git. Se um dia o grupo quiser abrir o repositório, essa conversa é
separada e passa pelo professor.

Pra saber se o Pro já chegou, rode:

    bash scripts/proteger-main.sh

O script confere sozinho. Se o Pro ainda não sincronizou, ele diz isso e sai
sem fazer nada, então dá pra rodar de novo amanhã sem medo. Quando estiver
ativo, ele aplica a proteção na hora.

## O que já freia hoje

`.githooks/pre-push` recusa push direto na `main` e na tentativa de apagá-la,
e mostra o caminho certo na mensagem. Ele se instala sozinho no `npm install`
pelo script `prepare`, então quem clonar e instalar já vem com o freio.

Seja honesto sobre o que ele é: um freio, não uma tranca. Roda na máquina de
quem empurra, então `--no-verify` passa por cima, e quem não rodar
`npm install` nunca teve o hook. Ele resolve o caso que de fato aconteceu,
que foi alguém empurrando sem saber que não devia. Não resolve o caso de
alguém decidindo empurrar mesmo assim.

Por isso ele não substitui nenhuma das duas saídas acima. É o que dá pra ter
enquanto elas não acontecem.

## Como ligar a tranca de verdade

    bash scripts/proteger-main.sh

Pode rodar quantas vezes quiser. Se o Pro ainda não sincronizou, ele diz isso
e sai sem tocar em nada. Se a proteção já existir, também não duplica. Ou
seja: rodar de vez em quando é a forma mais simples de descobrir que o Pro
chegou.

Quando estiver ativo, ele aplica um ruleset que exige pull
request com uma aprovação, CI verde, conversa de revisão resolvida, e bloqueia
force push e exclusão da `main`. O dono continua podendo contornar em
emergência, porque um time de quatro pessoas sem ninguém pra desbloquear
trava de vez num sábado à noite.

Confira depois com:

    gh api repos/iagorp6/Uroute/rulesets --jq '.[] | "\(.name): \(.enforcement)"'

Falta uma coisa que não tem API estável, então é na interface:
Settings, Actions, General, Fork pull request workflows, marque
"Require approval for all external contributors". Sem isso, pull request de
fork roda workflow no repositório sem ninguém olhar.

## O que não fazer

Não reescreva o histórico pra apagar o commit que entrou direto. Ele é
trabalho legítimo e já está na máquina dos outros. Reescrever a `main` de um
repositório compartilhado quebra o clone de todo mundo, e o remédio seria bem
pior que a doença.
