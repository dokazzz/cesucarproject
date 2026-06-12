# CESUCAR — Guia de Instalação e Execução

## Visão Geral

O CESUCAR é dividido em duas partes:

| Parte | Tecnologia | Descrição |
|---|---|---|
| **Frontend** | HTML + CSS + JavaScript | Interface do usuário (abrir no navegador) |
| **Backend** | Python + Flask | API REST com regras de negócio |

---

## Pré-requisitos

- Python 3.10 ou superior
- pip (gerenciador de pacotes Python)
- Navegador moderno (Chrome, Firefox, Edge)

---

## 1. Instalar dependências do backend

Abra o terminal na pasta `backend/` e execute:

```bash
cd backend
pip install -r requirements.txt
```

### Pacotes instalados

| Pacote | Versão mínima | Função |
|---|---|---|
| `flask` | 3.0 | Framework web para a API |
| `flask-cors` | 4.0 | Permite que o frontend acesse a API (CORS) |

---

## 2. Executar o servidor Flask

```bash
cd backend
python app.py
```

Saída esperada:

```
  CESUCAR API
  5 caronas de demonstração carregadas.
  Acesse: http://localhost:5000/status ou http://localhost:8000/status 
```

O servidor fica disponível em `http://localhost:5000` ou `http://localhost:8080`.

---

## 3. Abrir o frontend

Com o servidor Flask rodando, abra o arquivo `index.html` no navegador.

**Forma simples (sem servidor):**
- Clique duas vezes em `index.html` — o frontend funciona com localStorage.

**Forma completa (com integração à API):**
- Serve o frontend com qualquer servidor estático. Exemplo com Python:

```bash
# Na raiz do projeto (pasta cesucar/)
python -m http.server 8080
```

- Acesse `http://localhost:8080`

---

## 4. Testar a API

### 4.1 Verificar status

```bash
curl http://localhost:5000/status
```

Resposta esperada:
```json
{"sistema": "Cesucar", "status": "Online"}
```

### 4.2 Calcular custo de carona

```bash
curl -X POST http://localhost:5000/calcular-carona \
  -H "Content-Type: application/json" \
  -d '{"distancia": 25, "consumo": 12, "preco_combustivel": 6.00, "passageiros": 4}'
```

Resposta esperada:
```json
{"custo_total": 12.5, "valor_por_pessoa": 3.12}
```

### 4.3 Listar caronas

```bash
curl http://localhost:5000/caronas
```

Filtrar apenas caronas de ida:
```bash
curl http://localhost:5000/caronas?tipo=ida
```

### 4.4 Cadastrar nova carona

```bash
curl -X POST http://localhost:5000/caronas \
  -H "Content-Type: application/json" \
  -d '{
    "motorista": "Ana Costa",
    "origem": "Cachoeirinha",
    "destino": "Porto Alegre",
    "horario": "07:30",
    "vagas": 3,
    "valor": 10.0,
    "data": "2026-06-10",
    "veiculo": "Onix prata",
    "tipo": "ida"
  }'
```

### 4.5 Remover carona

```bash
curl -X DELETE http://localhost:5000/caronas/1
```

---

## 5. Estrutura de arquivos

```
cesucar/
├── backend/
│   ├── app.py              ← API Flask (ponto de entrada)
│   ├── carona.py           ← Classe Carona + GerenciadorCaronas (POO)
│   └── requirements.txt    ← Dependências Python
├── css/
│   └── style.css
├── js/
│   └── app.js
├── index.html
├── login.html
├── cadastro.html
├── dashboard.html
├── procurar-carona.html
├── oferecer-carona.html    ← Página do motorista (novo)
├── logo.png
└── INSTALACAO.md           ← Este arquivo
```

---

## 6. Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/status` | Status do sistema |
| POST | `/calcular-carona` | Calcula custo e valor por pessoa |
| GET | `/caronas` | Lista todas as caronas |
| GET | `/caronas?tipo=ida` | Lista apenas caronas de ida |
| GET | `/caronas?tipo=volta` | Lista apenas caronas de volta |
| POST | `/caronas` | Cadastra nova carona |
| GET | `/caronas/<id>` | Busca carona por ID |
| PUT | `/caronas/<id>` | Atualiza carona |
| DELETE | `/caronas/<id>` | Remove carona |

---

## 7. Fórmula de cálculo de custo

```
custo_total      = (distancia / consumo) × preco_combustivel
valor_por_pessoa = custo_total / passageiros
```

**Exemplo:**
- Distância: 25 km
- Consumo: 12 km/L
- Preço do combustível: R$ 6,00/L
- Passageiros: 4

```
custo_total      = (25 / 12) × 6,00 = R$ 12,50
valor_por_pessoa = 12,50 / 4        = R$ 3,12
```

---

## 8. Integração Frontend ↔ Backend

O frontend usa `fetch()` para se comunicar com a API Flask.

**Exemplo de uso no JavaScript:**

```javascript
// Calcular custo de uma carona
async function calcularCarona(distancia, consumo, precoCombustivel, passageiros) {
  try {
    const response = await fetch("http://localhost:5000/calcular-carona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distancia, consumo, preco_combustivel: precoCombustivel, passageiros })
    });
    const data = await response.json();
    console.log("Custo total:", data.custo_total);
    console.log("Por pessoa:", data.valor_por_pessoa);
  } catch (error) {
    console.error("API indisponível, usando cálculo local.");
  }
}
```

O sistema foi projetado com **graceful degradation**: se a API não estiver rodando, o frontend continua funcionando com os dados armazenados no `localStorage`.

---

## 9. Preparação para banco de dados

A classe `GerenciadorCaronas` em `carona.py` usa uma lista em memória intencionalmente simples, facilitando a futura migração para um banco de dados. Para integrar com SQLite, PostgreSQL ou outro BD, substitua os métodos `adicionar`, `listar`, `buscar_por_id`, `atualizar` e `remover` por chamadas ao ORM/driver desejado — a interface pública permanece a mesma.

---

*CESUCAR — Centro Universitário CESUCA · 2026*
