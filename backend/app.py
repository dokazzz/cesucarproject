"""
API Flask do sistema CESUCAR — Caronas Universitárias.

Rotas disponíveis:
  GET  /status                → status do sistema
  POST /calcular-carona       → calcula custo total e por pessoa
  GET  /caronas               → lista caronas (filtro: ?tipo=ida|volta)
  POST /caronas               → cadastra nova carona
  GET  /caronas/<id>          → busca carona por ID
  PUT  /caronas/<id>          → atualiza dados de uma carona
  DELETE /caronas/<id>        → remove uma carona

Como executar:
  pip install -r requirements.txt
  python app.py
  → Acesse: http://localhost:5000
"""

from flask import Flask, jsonify, request
from flask_cors import CORS

from carona import Carona, GerenciadorCaronas

# ------------------------------------------------------------------
# Configuração da aplicação
# ------------------------------------------------------------------

app = Flask(__name__)
CORS(app)  # Permite que o frontend (outra porta/domínio) acesse a API

gerenciador = GerenciadorCaronas()

# Dados de demonstração para desenvolvimento
_caronas_demo = [
    Carona("João Silva",    "Cachoeirinha", "Porto Alegre", "07:20", 3, 10.0, "2026-06-04", "Onix prata",    "ida"),
    Carona("Pedro Martins", "Gravataí",     "Porto Alegre", "08:10", 2, 12.0, "2026-06-04", "HB20 branco",   "ida"),
    Carona("Marina Souza",  "Canoas",       "Porto Alegre", "18:30", 4,  8.0, "2026-06-04", "Argo vermelho", "volta"),
    Carona("Lucas Pereira", "Alvorada",     "Porto Alegre", "19:10", 3, 15.0, "2026-06-04", "Gol azul",      "volta"),
    Carona("Bianca Rocha",  "Porto Alegre", "Cachoeirinha", "21:40", 2, 10.0, "2026-06-05", "Fit cinza",     "volta"),
]
for _c in _caronas_demo:
    gerenciador.adicionar(_c)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _campos_faltando(dados: dict, obrigatorios: list) -> list:
    return [campo for campo in obrigatorios if not str(dados.get(campo, "")).strip()]


def _erro(mensagem: str, codigo: int = 400):
    return jsonify({"erro": mensagem}), codigo


# ------------------------------------------------------------------
# Rotas
# ------------------------------------------------------------------

@app.route("/status")
def status():
    """Verifica se a API está operacional."""
    return jsonify({"sistema": "Cesucar", "status": "Online"})


@app.route("/calcular-carona", methods=["POST"])
def calcular_carona():
    """
    Calcula o custo total e o valor por pessoa de uma carona.

    Corpo JSON esperado:
        {
          "distancia": 25,
          "consumo": 12,
          "preco_combustivel": 6.00,
          "passageiros": 4
        }

    Resposta:
        {
          "custo_total": 12.50,
          "valor_por_pessoa": 3.12
        }
    """
    dados = request.get_json(silent=True) or {}

    faltando = _campos_faltando(dados, ["distancia", "consumo", "preco_combustivel", "passageiros"])
    if faltando:
        return _erro(f"Campos obrigatórios ausentes: {', '.join(faltando)}")

    try:
        resultado = Carona.calcular_custo(
            distancia=float(dados["distancia"]),
            consumo=float(dados["consumo"]),
            preco_combustivel=float(dados["preco_combustivel"]),
            passageiros=int(dados["passageiros"]),
        )
        return jsonify(resultado)
    except (ValueError, TypeError) as err:
        return _erro(str(err), 422)


@app.route("/caronas", methods=["GET"])
def listar_caronas():
    """
    Lista todas as caronas.

    Parâmetros de query:
        tipo (str): "ida" ou "volta" para filtrar por direção
    """
    tipo = request.args.get("tipo")
    return jsonify(gerenciador.listar(tipo=tipo))


@app.route("/caronas", methods=["POST"])
def cadastrar_carona():
    """
    Cadastra uma nova carona.

    Corpo JSON:
        motorista, origem, destino, horario, vagas, valor, data  (obrigatórios)
        veiculo, tipo  (opcionais; tipo padrão = "ida")
    """
    dados = request.get_json(silent=True) or {}

    faltando = _campos_faltando(dados, ["motorista", "origem", "destino", "horario", "vagas", "valor", "data"])
    if faltando:
        return _erro(f"Campos obrigatórios: {', '.join(faltando)}")

    try:
        carona = Carona(
            motorista=dados["motorista"],
            origem=dados["origem"],
            destino=dados["destino"],
            horario=dados["horario"],
            vagas=int(dados["vagas"]),
            valor=float(dados["valor"]),
            data=dados["data"],
            veiculo=dados.get("veiculo", ""),
            tipo=dados.get("tipo", "ida"),
        )
        gerenciador.adicionar(carona)
        return jsonify(carona.to_dict()), 201
    except (ValueError, TypeError) as err:
        return _erro(str(err), 422)


@app.route("/caronas/<int:carona_id>", methods=["GET"])
def buscar_carona(carona_id: int):
    """Retorna os dados de uma carona pelo ID."""
    carona = gerenciador.buscar_por_id(carona_id)
    if not carona:
        return _erro("Carona não encontrada.", 404)
    return jsonify(carona.to_dict())


@app.route("/caronas/<int:carona_id>", methods=["PUT"])
def atualizar_carona(carona_id: int):
    """Atualiza os dados de uma carona existente."""
    dados = request.get_json(silent=True) or {}
    carona = gerenciador.atualizar(carona_id, dados)
    if not carona:
        return _erro("Carona não encontrada.", 404)
    return jsonify(carona.to_dict())


@app.route("/caronas/<int:carona_id>", methods=["DELETE"])
def remover_carona(carona_id: int):
    """Remove uma carona pelo ID."""
    if gerenciador.remover(carona_id):
        return jsonify({"mensagem": "Carona removida com sucesso."})
    return _erro("Carona não encontrada.", 404)


# ------------------------------------------------------------------
# Ponto de entrada
# ------------------------------------------------------------------

if __name__ == "__main__":
    print(f"\n  CESUCAR API")
    print(f"  {gerenciador.total()} caronas de demonstração carregadas.")
    print(f"  Acesse: http://localhost:5000/status\n")
    app.run(debug=True, port=5000)
