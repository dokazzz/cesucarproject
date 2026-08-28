# Onde hospedar, e como criar

Guia para colocar o backend do Uroute no ar. Escrito para quem nunca fez deploy.

## A decisão, e por que ela mudou

A primeira recomendação deste projeto foi Render mais Neon, os dois no plano gratuito. Estava errada por dois motivos.

**O sono do Render é longo.** No plano gratuito, o app dorme depois de um tempo parado e uma aplicação Python leva perto de um minuto para acordar. Numa apresentação, isso é a diferença entre o app abrir e alguém achar que travou.

**Vocês são universitários.** O GitHub Student Developer Pack dá crédito que resolve isso sem custo, e isso deveria ter sido a primeira pergunta, não a última.

### O que usar

**Heroku, pelo Student Pack.** O pacote dá 312 dólares em crédito, liberados a 13 dólares por mês durante 24 meses. Um dyno Basic custa 7 e não dorme; um Postgres Mini custa 5. Somam 12, dentro do crédito mensal. Ou seja: **backend sempre acordado e banco gerenciado, sem tirar dinheiro do bolso de ninguém, por dois anos.**

O backend é um processo web e um Postgres, sem Redis nem fila, então é exatamente o formato que essa combinação atende.

### Um bônus que resolve outro problema

O Student Pack inclui **GitHub Pro**, e com ele **proteção de branch funciona em repositório privado**. Era o motivo pelo qual a gente ia tornar o repositório público. Com o Pro, dá para proteger a `main` sem abrir o código, e a decisão de ficar público vira escolha de portfólio em vez de necessidade técnica.

### Alternativas, se o Student Pack não sair

| Opção                       | Custo                         | Pega o quê                                            |
| --------------------------- | ----------------------------- | ----------------------------------------------------- |
| **Render grátis + Neon**    | Zero                          | Funciona, mas o backend dorme e demora a acordar      |
| **Railway**                 | A partir de 5 dólares por mês | Melhor experiência de uso, sem plano gratuito         |
| **Azure pelo Student Pack** | 100 dólares de crédito        | Mais crédito, porém bem mais complicado de configurar |

---

## Passo 1: pegar o Student Pack

Isso destrava todo o resto, então é o primeiro.

1. Acesse **education.github.com/pack** e clique em _Get student benefits_.
2. Faça login com a conta do GitHub que você usa no projeto.
3. Comprove que é estudante. Aceitam e-mail institucional, foto da carteirinha ou comprovante de matrícula. E-mail institucional costuma aprovar em minutos; documento pode levar alguns dias.
4. Espere a aprovação chegar por e-mail.

> **Faça isso hoje.** Não é o passo mais difícil, é o mais demorado, e todos os outros dependem dele.

## Passo 2: decidir de onde o backend vem

O Heroku faz deploy a partir de um repositório Git. Hoje o código do backend está no projeto de um colega, então antes de qualquer coisa o grupo precisa combinar uma destas:

- **Repositório próprio para o backend.** O colega dono do código cria, ou autoriza você a criar uma cópia. Mais limpo, e separa o ciclo do backend do ciclo do app.
- **Acesso ao repositório dele.** Você vira collaborator e faz deploy de lá.

Isso é conversa de grupo, não questão técnica: o trabalho é dele.

## Passo 3: criar o app no Heroku

1. Crie a conta em **heroku.com**, usando o mesmo e-mail do GitHub.
2. Ative o benefício de estudante em **heroku.com/github-students**.
3. No painel, **New > Create new app**. Escolha um nome, por exemplo `uroute-api`, e a região mais próxima.
4. Na aba **Deploy**, conecte com o GitHub e escolha o repositório do backend.
5. Na aba **Resources**, procure _Heroku Postgres_ e adicione o plano **Mini**.
6. Ainda em **Resources**, no dyno, escolha o tipo **Basic**. Confirme no painel que ele não dorme, que é a diferença para o Eco.

O Postgres já cria a variável `DATABASE_URL` sozinha. Você não precisa copiar nada.

## Passo 4: dizer ao Heroku como iniciar

Na raiz do repositório do backend, crie um arquivo chamado `Procfile`, sem extensão, com uma linha:

```
web: uvicorn app:app --host 0.0.0.0 --port $PORT
```

É a mesma linha que já está no `railway.toml`, só noutro formato. O `$PORT` é obrigatório: o Heroku escolhe a porta e a informa por variável.

## Passo 5: preencher as variáveis de ambiente

Em **Settings > Config Vars**, adicione as que estão no `.env.example` do backend.

**Gere segredos novos.** Não reaproveite os antigos: eles estiveram num arquivo que circulou pelo grupo, então trate como comprometidos. Não é desconfiança de ninguém, é higiene padrão.

Para gerar um segredo forte:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Rode duas vezes, uma para `JWT_SECRET_KEY` e outra para `ADMIN_PASSWORD`.

O `CORS_ORIGINS` precisa aceitar a origem do app, que **não é a mesma do site**. Esse é o erro que costuma consumir uma sprint inteira quando aparece na quinta-feira.

## Passo 6: criar as tabelas

Com o app no ar, rode as migrações que já existem:

```powershell
heroku run "alembic upgrade head" --app uroute-api
heroku run "python seed.py" --app uroute-api
```

A primeira cria as tabelas, a segunda popula com dados de teste.

## Passo 7: conferir e apontar o app

Teste no navegador:

```
https://uroute-api.herokuapp.com/status
```

Respondeu, está no ar. Agora no projeto do app, copie `.env.example` para `.env` e coloque:

```
EXPO_PUBLIC_API_URL=https://uroute-api.herokuapp.com/api/v1
```

Reinicie o `npm start`. O app para de usar dados falsos e passa a falar com o servidor.

Use `/api/v1`, não `/api`. A versão sem número devolve lista crua para não quebrar o site antigo; a v1 devolve página com cursor, que é o que o app quer.

---

## O que nunca colar em conversa

Alguns valores são credencial e não devem aparecer em chat, mensagem ou issue. Ficam no painel do Heroku e no `.env` local, e só.

| Pode compartilhar                              | Nunca compartilhe |
| ---------------------------------------------- | ----------------- |
| URL do app, `https://uroute-api.herokuapp.com` | `DATABASE_URL`    |
| URL do repositório                             | `JWT_SECRET_KEY`  |
| Nome do app no Heroku                          | `ADMIN_PASSWORD`  |

## Se algo der errado

**O app não sobe.** `heroku logs --tail --app uroute-api` mostra o erro. Quase sempre é dependência faltando no `requirements.txt` ou variável de ambiente não preenchida.

**O app sobe mas responde 500.** Normalmente é `DATABASE_URL` ausente ou migração não rodada. Confira o Passo 6.

**O app responde mas o celular não conecta.** Quase sempre é `CORS_ORIGINS`. O erro aparece no console do Metro, não no log do servidor.

**O crédito acabou.** São 13 dólares por mês durante 24 meses, então dá para o curso inteiro. Se acabar, a alternativa sem custo é Render mais Neon, aceitando o sono do backend.
