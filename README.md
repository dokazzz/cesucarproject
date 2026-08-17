# CESUCAR

Carona compartilhada para estudantes do Centro Universitário CESUCA
(Cachoeirinha/RS). Alunos publicam viagens até o campus e de volta para casa,
procuram caronas por cidade, data e horário, e solicitam vagas que o motorista
aprova.

API em **FastAPI + SQLAlchemy + PostgreSQL**. Frontend em HTML, CSS e
JavaScript sem framework.

> **Estado atual:** a API está pronta e testada; a hospedagem definitiva ainda
> não foi provisionada. Veja [Situação](#situação) antes de implantar.

---

## Stack

| Camada | Tecnologia |
|---|---|
| API | FastAPI, Pydantic v2 |
| Dados | SQLAlchemy 2.0, Alembic, PostgreSQL |
| Autenticação | JWT de acesso (15 min) + refresh token rotativo (30 dias), senhas com bcrypt |
| Limite de requisições | slowapi, em memória |
| Frontend | HTML/CSS/JS, sem build |
| Testes | pytest (157 testes, sem banco) |
| Lint | ruff |
| CI | GitHub Actions |

Python **3.12**. A versão importa: o passlib 1.7.4 usa o módulo `crypt` da
biblioteca padrão, removido no 3.13.

---

## Como rodar

Pré-requisitos: Python 3.12 e um PostgreSQL acessível.

```bash
# 1. Ambiente virtual
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux/macOS

# 2. Dependências
pip install -r backend/requirements-dev.txt

# 3. Configuração
cp backend/.env.example backend/.env
```

Preencha `backend/.env`. Três valores são **obrigatórios** e a aplicação se
recusa a iniciar sem eles — não existe mais valor padrão de desenvolvimento:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"   # SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(48))"   # JWT_SECRET_KEY
# DATABASE_URL=postgresql://usuario:senha@host:5432/banco
```

```bash
# 4. Migrações
cd backend
alembic upgrade head

# 5. API
uvicorn app:app --reload --port 8000
```

O frontend é estático. Sirva a raiz do projeto com qualquer servidor
(a extensão Live Server do VS Code na porta 5500 já está na lista de origens
permitidas do CORS) ou rode `python main.py` para servir páginas e API juntas.

### Testes e lint

```bash
cd backend
pytest              # 157 testes, ~12s, não precisa de banco
ruff check . ../main.py
```

Os testes não tocam em banco algum: os objetos ORM são instanciados em memória
e a serialização é Python puro. `DATABASE_URL` aponta para uma porta fechada de
propósito, para que nenhum teste alcance um banco real por acidente.

---

## API

Versionada em `/api/v1`. Os caminhos antigos sem versão (`/api/...`) continuam
funcionando para o frontend web atual e respondem com cabeçalhos `Deprecation`
e `Sunset`.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Cadastro (RGM de 8 dígitos) |
| `POST` | `/api/v1/auth/login` | Autenticação |
| `POST` | `/api/v1/auth/refresh` | Renova o par de tokens |
| `POST` | `/api/v1/auth/logout` | Encerra a sessão |
| `GET` `DELETE` | `/api/v1/auth/sessions` | Lista / encerra sessões ativas |
| `GET` `PATCH` | `/api/v1/auth/me` | Perfil do usuário autenticado |
| `GET` | `/api/v1/rides` | Busca caronas (paginada por cursor) |
| `POST` | `/api/v1/rides` | Publica uma carona (motoristas) |
| `POST` | `/api/v1/rides/{id}/request` | Solicita uma vaga |
| `POST` | `/api/v1/rides/{id}/requests/{req}/approve` | Motorista aprova |
| `GET` | `/api/v1/notifications` | Notificações do usuário |
| `GET` | `/api/v1/admin/users` | Administração (papel `ADMIN`) |
| `GET` | `/status` | Liveness — o processo responde |
| `GET` | `/health` | Readiness — o processo alcança o banco |

Erros trazem um `code` estável além da mensagem em português, para que um
cliente decida pelo código e não pelo texto:

```json
{ "detail": "Esta carona está sem vagas disponíveis.", "code": "RIDE_FULL" }
```

`ENABLE_DOCS=true` habilita `/docs` (Swagger) e `/redoc`. Fica desligado fora
de `DEBUG`, porque a documentação é um mapa completo da superfície da API.

### Privacidade dos dados

Os dados do motorista são liberados em três níveis, conforme quem pergunta:

| Nível | Quem | O que vê |
|---|---|---|
| público | qualquer um, sem login | rota, data, horário, preço, vagas |
| autenticado | aluno logado | nome, curso, veículo, bairro de embarque |
| contato | motorista, admin, ou passageiro **aprovado** | telefone, placa, bairro do motorista |

Telefone, placa e endereço nunca chegam a quem não tem relação com a carona.
A mesma regra vale no sentido inverso: o motorista só recebe o telefone e o
RGM do passageiro depois de aprovar a solicitação.

---

## Estrutura

```
backend/
  app.py                 aplicação, middlewares, tratador de exceções
  config.py              configuração validada na importação
  app_time.py            conversão de horário local (America/Sao_Paulo)
  errors.py              códigos de erro estáveis
  rate_limit.py          limite por IP
  logging_config.py      logs em texto ou JSON
  routes/                camada HTTP
  controllers/           traduz exceções de serviço para HTTP
  services/              regras de negócio
  database/
    models/              modelos ORM
    repositories/        acesso a dados
    migrations/          Alembic
  tests/                 pytest
*.html, css/, js/        frontend
```

Fluxo de uma requisição: `routes` → `controllers` → `services` →
`repositories` → banco.

---

## Situação

Concluído: correções de segurança (exposição de PII, XSS, segredos, limite de
requisições, visibilidade de falhas), API versionada, fluxo de tokens,
paginação, suíte de testes e CI.

Pendente:

- **Hospedagem.** As configurações de Vercel e Railway ainda estão no
  repositório e nenhuma das duas foi escolhida — a decisão é uma VM Oracle
  Cloud Always Free com Caddy, ainda não provisionada.
- **Migrações `003` e `004`** ainda não foram aplicadas. A `003` corrige o
  horário das caronas já cadastradas e precisa ser aplicada junto com o código
  que corrige a gravação.
- **Rotação de segredos.** `backend/.env` foi versionado com valores reais no
  passado. Eles continuam no histórico do repositório e precisam ser trocados.

---

## Autoria

Desenvolvido por Eduardo Dorneles Ribeiro para a disciplina de Programação
Orientada a Objetos, sob orientação do Prof. Arthur Marques de Oliveira.
