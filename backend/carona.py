"""
Módulo com a classe Carona e GerenciadorCaronas — regras de negócio do CESUCAR.

Utiliza Programação Orientada a Objetos (POO) para representar caronas,
calcular custos e gerenciar o ciclo de vida das viagens.
"""

from __future__ import annotations


class Carona:
    """
    Representa uma carona universitária com dados de rota e cálculo de custo.

    Atributos:
        id          : Identificador único (atribuído pelo GerenciadorCaronas)
        motorista   : Nome do motorista
        origem      : Cidade/local de partida
        destino     : Cidade/local de chegada
        horario     : Horário de saída no formato HH:MM
        vagas       : Total de vagas oferecidas (exceto motorista)
        valor       : Valor cobrado por passageiro (R$)
        data        : Data da viagem no formato YYYY-MM-DD
        veiculo     : Descrição do veículo (ex.: "Onix prata")
        tipo        : Direção da viagem: "ida" (→ faculdade) ou "volta" (→ casa)
    """

    def __init__(
        self,
        motorista: str,
        origem: str,
        destino: str,
        horario: str,
        vagas: int,
        valor: float,
        data: str,
        veiculo: str = "",
        tipo: str = "ida",
    ) -> None:
        self.id: int | None = None
        self.motorista = motorista
        self.origem = origem
        self.destino = destino
        self.horario = horario
        self.vagas = int(vagas)
        self.valor = float(valor)
        self.data = data
        self.veiculo = veiculo
        self.tipo = tipo if tipo in ("ida", "volta") else "ida"

    # ------------------------------------------------------------------
    # Cálculo de custo (método estático — não precisa de instância)
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_custo(
        distancia: float,
        consumo: float,
        preco_combustivel: float,
        passageiros: int,
    ) -> dict:
        """
        Calcula o custo total e o valor por pessoa de uma carona.

        Args:
            distancia         : Distância percorrida em km
            consumo           : Eficiência do veículo em km/litro
            preco_combustivel : Preço do litro do combustível em R$
            passageiros       : Número de passageiros (excluindo o motorista)

        Returns:
            {"custo_total": float, "valor_por_pessoa": float}

        Raises:
            ValueError: Se consumo ou passageiros forem ≤ 0, ou distância < 0
        """
        if distancia < 0:
            raise ValueError("Distância não pode ser negativa.")
        if consumo <= 0:
            raise ValueError("Consumo deve ser maior que zero.")
        if passageiros <= 0:
            raise ValueError("Número de passageiros deve ser maior que zero.")
        if preco_combustivel < 0:
            raise ValueError("Preço do combustível não pode ser negativo.")

        custo_total = (distancia / consumo) * preco_combustivel
        valor_por_pessoa = custo_total / passageiros

        return {
            "custo_total": round(custo_total, 2),
            "valor_por_pessoa": round(valor_por_pessoa, 2),
        }

    # ------------------------------------------------------------------
    # Serialização
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Converte a instância para dicionário serializável em JSON."""
        return {
            "id": self.id,
            "motorista": self.motorista,
            "origem": self.origem,
            "destino": self.destino,
            "horario": self.horario,
            "vagas": self.vagas,
            "valor": self.valor,
            "data": self.data,
            "veiculo": self.veiculo,
            "tipo": self.tipo,
        }

    def __repr__(self) -> str:
        return (
            f"Carona(id={self.id}, motorista={self.motorista!r}, "
            f"{self.origem!r} → {self.destino!r}, "
            f"{self.data} {self.horario}, tipo={self.tipo!r})"
        )


class GerenciadorCaronas:
    """
    Gerencia a coleção de caronas em memória.

    Preparado para futura integração com banco de dados: basta substituir
    a lista interna por chamadas ao ORM/driver de BD preferido.

    Exemplo de uso:
        g = GerenciadorCaronas()
        c = Carona("Ana", "Cachoeirinha", "Porto Alegre", "07:30", 3, 10.0, "2026-06-10")
        g.adicionar(c)
        print(g.listar())
    """

    def __init__(self) -> None:
        self._caronas: list[Carona] = []
        self._next_id: int = 1

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def adicionar(self, carona: Carona) -> Carona:
        """Atribui um ID sequencial e persiste a carona."""
        carona.id = self._next_id
        self._next_id += 1
        self._caronas.append(carona)
        return carona

    def listar(self, tipo: str | None = None) -> list[dict]:
        """
        Retorna todas as caronas como lista de dicionários.

        Args:
            tipo: "ida" ou "volta" para filtrar; None retorna todas.
        """
        resultado = self._caronas
        if tipo in ("ida", "volta"):
            resultado = [c for c in resultado if c.tipo == tipo]
        return [c.to_dict() for c in resultado]

    def buscar_por_id(self, carona_id: int) -> Carona | None:
        """Retorna a carona com o ID fornecido, ou None se não encontrada."""
        return next((c for c in self._caronas if c.id == carona_id), None)

    def atualizar(self, carona_id: int, dados: dict) -> Carona | None:
        """
        Atualiza campos de uma carona existente.

        Args:
            carona_id : ID da carona a alterar
            dados     : Dicionário com campos a sobrescrever

        Returns:
            A carona atualizada, ou None se não encontrada.
        """
        carona = self.buscar_por_id(carona_id)
        if not carona:
            return None
        campos_permitidos = {"motorista", "origem", "destino", "horario",
                             "vagas", "valor", "data", "veiculo", "tipo"}
        for campo, valor in dados.items():
            if campo in campos_permitidos:
                setattr(carona, campo, valor)
        return carona

    def remover(self, carona_id: int) -> bool:
        """
        Remove a carona com o ID informado.

        Returns:
            True se a carona foi encontrada e removida, False caso contrário.
        """
        anterior = len(self._caronas)
        self._caronas = [c for c in self._caronas if c.id != carona_id]
        return len(self._caronas) < anterior

    def total(self) -> int:
        """Retorna o número total de caronas cadastradas."""
        return len(self._caronas)
