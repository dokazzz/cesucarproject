# CESUCAR — Guia de Instalação e Execução

Guia passo a passo para rodar o projeto localmente.

> Este documento descrevia uma versão anterior em Flask com dados em memória.
> O projeto migrou para FastAPI, SQLAlchemy, Alembic e PostgreSQL, e este guia
> foi reescrito para o que existe hoje no repositório.

## Visão Geral

| Parte | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | HTML + CSS + JavaScript | Interface do usuário, sem build |
| **Backend** | Python + FastAPI | API REST com as regras de negócio |
| **Banco** | PostgreSQL | Dados persistentes, migrados com Alembic |

---

## Pré-requisitos

- **Python 3.12** — a versão importa. O `passlib` 1.7.4 importa o módulo
  `crypt` da biblioteca padrão, que foi removido no Python 3.13. O arquivo
  `.python-version` fixa a versão.
- PostgreSQL acessível (local ou remoto)
- Navegador moderno (Chrome, Firefox, Edge)

---

## 1. Criar o ambiente virtual

Na raiz do projeto:

```bash
python -m venv .venv
```

Ative o ambiente:

```bash
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux / macOS
```

---

## 2. Instalar as dependências

```bash
pip install -r backend/requirements-dev.txt
```

O arquivo `requirements-dev.txt` inclui o `requirements.txt` de produção mais
as ferramentas de teste (`pytest`, `ruff`). Para um servidor, use apenas
`backend/requirements.txt`.

---

## 3. Configurar as variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Abra `backend/.env` e preencha. **Três valores são obrigatórios** e a aplicação
se recusa a iniciar sem eles:

| Variável | O que é |
|---|---|
| `SECRET_KEY` | Chave da aplicação, mínimo 32 caracteres |
| `JWT_SECRET_KEY` | Assina os tokens de acesso, mínimo 32 caracteres |
| `DATABASE_URL` | `postgresql://usuario:senha@host:5432/banco` |

Para gerar as chaves:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Não existe mais valor padrão de desenvolvimento para essas variáveis. Isso é
proposital: antes, uma chave ausente caía num valor fixo escrito no código, e o
servidor subia normalmente assinando tokens com um segredo público. Hoje ele
para na inicialização com uma mensagem explicando o que falta.

Defina também `ADMIN_PASSWORD` (mínimo 8 caracteres). A conta de administrador
é criada na primeira inicialização com o RGM `00000001`.

> `backend/.env` está no `.gitignore` e **nunca** deve ser versionado.

---

## 4. Aplicar as migrações

```bash
cd backend
alembic upgrade head
```

Isso cria as tabelas e os tipos enumerados no banco indicado por
`DATABASE_URL`.

---

## 5. Subir a API

Ainda em `backend/`:

```bash
uvicorn app:app --reload --port 8000
```

A API responde em `http://localhost:8000`.

Para conferir se está no ar:

- `http://localhost:8000/status` — o processo respondeu
- `http://localhost:8000/health` — o processo respondeu **e** alcançou o banco

Se quiser a documentação interativa em `/docs`, defina `ENABLE_DOCS=true` no
`.env`. Ela fica desligada por padrão fora de `DEBUG`, porque expõe o mapa
completo da API.

---

## 6. Abrir o frontend

O frontend é estático e não precisa de build. Duas opções:

**a) Servidor estático separado** — no VS Code, extensão *Live Server*, botão
"Go Live". A porta 5500 já está na lista de origens permitidas do CORS.

**b) Tudo pelo backend** — na raiz do projeto:

```bash
python main.py
```

Isso serve as páginas HTML e a API no mesmo endereço.

Abra `index.html` e faça login com o RGM `00000001` e a senha definida em
`ADMIN_PASSWORD`, ou cadastre um usuário novo.

---

## 7. Rodar os testes

```bash
cd backend
pytest
ruff check . ../main.py
```

São 157 testes e levam cerca de 12 segundos. **Não é preciso ter banco**: os
objetos são criados em memória. A `DATABASE_URL` usada nos testes aponta para
uma porta fechada de propósito, para garantir que nenhum teste alcance um banco
real por engano.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `ConfigError: SECRET_KEY is not set` | Falta preencher `backend/.env`. A mensagem diz qual variável e como gerá-la. |
| `ZoneInfoNotFoundError: America/Sao_Paulo` | Falta o pacote `tzdata`. O Windows não traz banco de fusos do sistema. Está no `requirements.txt`. |
| `ModuleNotFoundError: No module named 'crypt'` | Python 3.13 ou superior. Use 3.12. |
| `connection refused` na porta 5432 | `DATABASE_URL` aponta para um banco que não está de pé. |
| `429 Muitas tentativas` no login | Limite de 8 tentativas por minuto por IP. Ajuste `RATE_LIMIT_LOGIN` para testar. |
| Login expira rápido | Esperado: o token de acesso dura 15 minutos e o frontend o renova sozinho pelo refresh token. |

---

## Implantação

Ainda não definida. O repositório tem configurações de Vercel e Railway que
sobraram de tentativas anteriores; a decisão é uma VM Oracle Cloud Always Free
com Caddy para TLS, ainda não provisionada. Este guia será atualizado quando
isso existir de verdade.

Duas coisas precisam acontecer antes de qualquer implantação com dados reais:

1. **Rotacionar os segredos.** O `backend/.env` foi versionado com valores
   reais no passado e eles continuam no histórico do repositório.
2. **Aplicar as migrações `003` e `004`.** A `003` corrige o horário das
   caronas já cadastradas e precisa ir junto com o código que corrige a
   gravação — aplicada depois, sobre dados já corretos, ela erra para o outro
   lado.
