# Mapa e localização ao vivo

Como o Uroute mostra onde a carona está, o que já foi construído e o que
ainda depende de decisão do grupo.

Este documento nasceu de uma proposta escrita antes da implementação. As
decisões dela foram mantidas, com duas correções de fato que aparecem
marcadas mais abaixo.

## O que já está no app

A tela de detalhe da carona mostra um mapa com três pinos: de onde a carona
sai, para onde vai, e onde o motorista está agora. Abaixo do mapa há uma
frase dizendo se ele ainda não saiu, se está a caminho e a quantos
quilômetros do destino, ou se já chegou.

O mapa só aparece para quem tem reserva aprovada naquela carona, ou para o
próprio motorista dono dela. Isso vale tanto para o desenho na tela quanto
para a chamada de dados: quem não tem vínculo recebe recusa, não recebe a
coordenada e um componente escondido.

A posição se atualiza sozinha a cada 8 segundos enquanto a tela estiver
aberta.

Hoje a posição vem do mock, simulada a partir do horário marcado da carona.
O motorista de verdade ainda não envia nada, porque isso depende de uma
decisão do grupo e de um backend que ainda não existe. As duas coisas estão
descritas em "O que falta".

## Biblioteca: react-native-maps

Usamos `react-native-maps`, não `expo-maps`. O `expo-maps` está em alpha e
exige development build, ou seja, não roda no Expo Go, e o teste do grupo
inteiro depende de abrir o QR code no Expo Go.

A versão está fixada em `1.27.2`, exatamente a que o SDK 57 valida. Não use
`^` aqui: uma minor nova da biblioteca pode não casar com o SDK, e o erro
aparece só na hora de rodar no celular.

Para instalar depois de um clone limpo, `npm install` resolve. O
`npx expo install` não funciona neste projeto por causa do
`EALLOWSCRIPTS` do npm 11, o que já está registrado no ROADMAP.

### Correção: "roda no Expo Go" tem asterisco

A proposta original dizia que `react-native-maps` roda no Expo Go sem
configuração nenhuma. A documentação oficial do SDK 57 realmente diz isso,
mas na prática depende da plataforma, e a diferença importa para o jeito
que o grupo testa.

No iPhone funciona limpo. O provider padrão no iOS é o Apple Maps, que não
pede chave de API nem cartão de crédito. Como o teste do grupo é justamente
"quem tem iPhone abre o QR code", o caminho principal está coberto.

No Android o provider é o Google Maps, que exige chave. O Expo Go não
consegue aplicar a configuração nativa do `app.json`, então a chave de vocês
nunca chega até lá, e o app cai na chave do próprio Expo Go. Há relatos
frequentes e recentes de tiles saindo em branco nesse cenário, com os pinos
aparecendo normalmente sobre o cinza. Se acontecer no Android de alguém, o
problema não é o código do Uroute.

O que isso muda na prática: demonstre no iPhone. Para publicar na Play Store
mais tarde vai ser preciso criar uma chave do Google Maps Platform com
faturamento habilitado e colocá-la no `app.config.ts`, nunca no código.

## Tempo real: polling primeiro, WebSocket só se precisar

A fase 1 é polling e é o que está construído. O passageiro pergunta a posição
de 8 em 8 segundos, que é o meio da faixa de 5 a 10 segundos combinada. O
motorista, quando existir backend, empurra a posição no mesmo ritmo pelo
`expo-location`.

A fase 2 seria uma conexão WebSocket, usando o suporte nativo do FastAPI.
Ela roda num dyno só do Heroku sem infraestrutura nova, sem Redis. Redis só
entraria se o backend passasse de um dyno, o que não é o caso hoje.

Não construa as duas. A fase 2 só se justifica se o polling parecer lento
com gente usando de verdade, e essa avaliação ainda não aconteceu.

Endpoints sugeridos, ainda não confirmados contra o backend real:

    POST /api/v1/rides/{id}/location    motorista envia a posição
    GET  /api/v1/rides/{id}/location    passageiro lê a última
    WS   /api/v1/rides/{id}/location/ws só na fase 2

## Privacidade

A posição ao vivo é o dado mais sensível que o app manipula. Telefone e placa
dizem quem a pessoa é; a posição diz onde ela está agora.

A regra é a mesma já usada para contato: só vê quem é o motorista dono da
carona ou teve a reserva aprovada por ele. Pedido pendente não dá acesso, e
pedido recusado ou reserva cancelada tiram o acesso de volta.

No código, essa condição mora numa função só, `temVinculoCom` em
`src/api/client.ts`, usada tanto pelo contato quanto pela posição. Duas
cópias da mesma regra é como um dia alguém afrouxa uma e esquece a outra.

O arquivo `src/api/localizacao.test.ts` trava esse comportamento em nove
testes. Quando o backend real entrar, esses testes viram a especificação que
ele precisa cumprir.

Vale repetir o que já vale para o resto do app: filtrar no cliente esconde,
não protege. Se a resposta da API trouxer a coordenada, ela vazou, tendo
componente desenhando ou não. A checagem de verdade tem que estar no
servidor.

## Rota e tempo estimado: fora por enquanto

Não desenhamos a rota nem calculamos ETA. Três pinos já respondem "cadê minha
carona", que é a pergunta real do passageiro.

Uma linha reta ligando os pinos seria pior que nada, porque o carro anda por
rua e a linha passaria por cima dos quarteirões. A distância que o app mostra
é em linha reta e diz isso na tela, justamente para ninguém achar que o
motorista parou quando a rua deu volta.

Rota de verdade exigiria a API de rotas do Google, que não tem mais o crédito
antigo de 200 dólares por mês, cobra por SKU e pede cartão cadastrado. Se um
dia isso for mesmo necessário, o caminho é o OSRM, que é aberto,
self-hostável e não cobra por requisição.

## Coordenadas

As coordenadas das cidades e do campus estão em `src/domain/geo.ts`. São o
centro aproximado de cada município, não o endereço de ninguém: o app nunca
pediu endereço e não vai passar a pedir só para enfeitar o mapa.

A coordenada do CESUCA foi tirada do bairro, não do endereço exato, e ninguém
do grupo conferiu ainda. Antes de mostrar para fora, abra o endereço real da
faculdade no Google Maps e corrija os dois números. Está marcado no código.

Um teste garante que toda cidade oferecida no app tem coordenada, e que todas
caem dentro do Rio Grande do Sul. Latitude e longitude trocadas é o erro que
não dá exceção nenhuma, só joga o pino no meio do Oceano Índico.

## O que falta

### Decisão do grupo: o motorista pode fechar o app?

Esta é a que trava a outra metade da feature, e é decisão de produto, não
técnica.

Para o motorista continuar mandando posição com o app em segundo plano, é
preciso permissão de localização em background. Isso não é um detalhe: o iOS
exige justificativa específica para aprovar "Permitir sempre" na revisão da
App Store, e o Android restringe localização em background desde o Android 10.

A alternativa é exigir que o motorista deixe o app aberto durante a viagem.
Isso elimina a permissão de background inteira e a complexidade de revisão
que vem junto. Para uma carona curta até a faculdade, pedir que o app fique
aberto parece uma troca razoável, mas quem decide é o grupo.

Enquanto isso não for decidido, o envio de posição pelo motorista não foi
implementado. O que existe é o lado do passageiro, que não precisa de
permissão nenhuma.

Qualquer que seja o caminho escolhido, use `expo-location`. Um módulo nativo
de geolocalização fora do Expo quebra o Expo Go do mesmo jeito que o
`expo-maps` quebraria.

### Backend

Os endpoints acima são um padrão sugerido, não um contrato confirmado. O
acesso ao repositório do backend continua pendente, então nem a estrutura
real nem o nome das rotas foram verificados. Enquanto isso, a posição vem do
mock.

Quando o backend entrar, a troca acontece dentro de `localizacaoDaCarona` em
`src/api/client.ts` e em mais nenhum lugar. Nenhuma tela sabe de onde vem a
coordenada.

### Onde isto entra no cronograma

Continua sendo decisão do grupo. Rastreamento ao vivo é um pedaço de trabalho
de verdade, com mapa, superfície nova de backend, permissão de sistema
operacional e consumo de bateria, e não é honesto enfiar isso numa sprint
existente sem o grupo concordar.

Dois lugares razoáveis: a Sprint 4, quando "oferecer carona" já existir e
fizer sentido o motorista também compartilhar posição, ou como esticada
depois da Sprint 6, se o semestre apertar.

O que já está no app é a parte que não depende dessa decisão: o passageiro
consegue ver o mapa da carona dele, e a regra de privacidade já está travada
por teste.
