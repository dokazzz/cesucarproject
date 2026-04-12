"""
Cesucar - Microserviço Python para Matching Inteligente de Rotas

Este serviço implementa algoritmos de matching entre motoristas e passageiros
baseado em proximidade geográfica, preferências e horários compatíveis.
"""

import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
from typing import Optional
import math
from datetime import datetime

app = fastapi.FastAPI(
    title="Cesucar Matching Service",
    description="Serviço de matching inteligente para caronas universitárias",
    version="1.0.0"
)

# Configuração CORS
app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== MODELOS DE DADOS =====

class Location(BaseModel):
    """Representa uma localização geográfica"""
    name: str
    lat: float
    lng: float


class Preferences(BaseModel):
    """Preferências do usuário para a carona"""
    music: bool = False
    smoking: bool = False
    pets: bool = False


class Ride(BaseModel):
    """Representa uma carona disponível"""
    id: str
    driver_id: str
    driver_name: str
    driver_rating: float
    origin: Location
    destination: Location
    date: str
    time: str
    available_seats: int
    total_seats: int
    price: float
    preferences: Preferences


class MatchRequest(BaseModel):
    """Requisição para buscar caronas compatíveis"""
    passenger_origin: Location
    passenger_destination: Location
    date: Optional[str] = None
    time: Optional[str] = None
    max_distance_km: float = 2.0  # Distância máxima aceitável do ponto de partida
    preferences: Optional[Preferences] = None


class MatchResult(BaseModel):
    """Resultado do matching com score de compatibilidade"""
    ride: Ride
    match_score: float  # 0-100
    origin_distance_km: float
    destination_distance_km: float
    preference_match: float  # 0-100
    time_compatibility: float  # 0-100


class RouteOptimizationRequest(BaseModel):
    """Requisição para otimização de rota"""
    origin: Location
    destination: Location
    waypoints: list[Location] = []


class RouteOptimizationResult(BaseModel):
    """Resultado da otimização de rota"""
    optimized_waypoints: list[Location]
    total_distance_km: float
    estimated_time_minutes: int


class RecommendationRequest(BaseModel):
    """Requisição para recomendação baseada em histórico"""
    user_id: str
    history: list[dict]
    current_location: Optional[Location] = None


class RecommendationResult(BaseModel):
    """Resultado da recomendação"""
    recommended_routes: list[dict]
    frequent_destinations: list[str]
    best_times: list[str]


# ===== DADOS MOCKADOS (Pontos conhecidos em São Paulo) =====

KNOWN_LOCATIONS: dict[str, Location] = {
    "Estação Pinheiros": Location(name="Estação Pinheiros", lat=-23.5667, lng=-46.7022),
    "CESU - Campus Centro": Location(name="CESU - Campus Centro", lat=-23.5505, lng=-46.6333),
    "Metrô Consolação": Location(name="Metrô Consolação", lat=-23.5567, lng=-46.6608),
    "Terminal Barra Funda": Location(name="Terminal Barra Funda", lat=-23.5264, lng=-46.6678),
    "CESU - Campus Sul": Location(name="CESU - Campus Sul", lat=-23.6100, lng=-46.6500),
    "Estação Vila Madalena": Location(name="Estação Vila Madalena", lat=-23.5464, lng=-46.6917),
}

# Caronas disponíveis (simulando banco de dados)
AVAILABLE_RIDES: list[Ride] = [
    Ride(
        id="1",
        driver_id="1",
        driver_name="João Silva",
        driver_rating=4.8,
        origin=KNOWN_LOCATIONS["Estação Pinheiros"],
        destination=KNOWN_LOCATIONS["CESU - Campus Centro"],
        date="2026-04-13",
        time="07:30",
        available_seats=2,
        total_seats=4,
        price=8.00,
        preferences=Preferences(music=True, smoking=False, pets=False)
    ),
    Ride(
        id="2",
        driver_id="3",
        driver_name="Pedro Costa",
        driver_rating=4.7,
        origin=KNOWN_LOCATIONS["Metrô Consolação"],
        destination=KNOWN_LOCATIONS["CESU - Campus Centro"],
        date="2026-04-13",
        time="08:00",
        available_seats=3,
        total_seats=4,
        price=6.50,
        preferences=Preferences(music=True, smoking=False, pets=True)
    ),
    Ride(
        id="3",
        driver_id="1",
        driver_name="João Silva",
        driver_rating=4.8,
        origin=KNOWN_LOCATIONS["Terminal Barra Funda"],
        destination=KNOWN_LOCATIONS["CESU - Campus Sul"],
        date="2026-04-13",
        time="18:30",
        available_seats=4,
        total_seats=4,
        price=10.00,
        preferences=Preferences(music=False, smoking=False, pets=False)
    ),
    Ride(
        id="4",
        driver_id="3",
        driver_name="Pedro Costa",
        driver_rating=4.7,
        origin=KNOWN_LOCATIONS["Estação Vila Madalena"],
        destination=KNOWN_LOCATIONS["CESU - Campus Centro"],
        date="2026-04-14",
        time="07:00",
        available_seats=1,
        total_seats=4,
        price=7.00,
        preferences=Preferences(music=True, smoking=False, pets=False)
    ),
]


# ===== FUNÇÕES UTILITÁRIAS =====

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calcula a distância em km entre dois pontos usando a fórmula de Haversine.
    
    Esta é a fórmula matemática para calcular a distância do grande círculo
    entre dois pontos em uma esfera, dado suas latitudes e longitudes.
    """
    R = 6371  # Raio da Terra em km
    
    # Converte graus para radianos
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    # Fórmula de Haversine
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def calculate_preference_match(passenger_prefs: Preferences, ride_prefs: Preferences) -> float:
    """
    Calcula o percentual de compatibilidade entre preferências.
    
    Retorna um valor de 0 a 100 indicando quão compatíveis são as preferências.
    """
    matches = 0
    total = 3  # música, fumante, pets
    
    # Música: compatível se ambos gostam ou se o passageiro não se importa
    if passenger_prefs.music == ride_prefs.music or not passenger_prefs.music:
        matches += 1
    
    # Fumante: se passageiro não aceita, motorista não pode fumar
    if not passenger_prefs.smoking or ride_prefs.smoking == passenger_prefs.smoking:
        matches += 1
    
    # Pets: compatível se ambos aceitam ou se o passageiro não tem pets
    if passenger_prefs.pets == ride_prefs.pets or not passenger_prefs.pets:
        matches += 1
    
    return (matches / total) * 100


def calculate_time_compatibility(requested_time: str, ride_time: str) -> float:
    """
    Calcula a compatibilidade de horário entre a solicitação e a carona.
    
    Quanto mais próximos os horários, maior a compatibilidade.
    """
    if not requested_time:
        return 100.0  # Se não especificou horário, qualquer um serve
    
    try:
        req_minutes = int(requested_time.split(":")[0]) * 60 + int(requested_time.split(":")[1])
        ride_minutes = int(ride_time.split(":")[0]) * 60 + int(ride_time.split(":")[1])
        
        diff = abs(req_minutes - ride_minutes)
        
        # Tolerância de 30 minutos = 100%, 1 hora = 50%, 2 horas = 0%
        if diff <= 30:
            return 100.0
        elif diff <= 60:
            return 100 - ((diff - 30) * (50 / 30))
        elif diff <= 120:
            return 50 - ((diff - 60) * (50 / 60))
        else:
            return 0.0
    except (ValueError, IndexError):
        return 50.0  # Valor padrão se houver erro no parsing


def resolve_location_name(name: str) -> Optional[Location]:
    """
    Resolve um nome de localização para coordenadas.
    
    Em uma implementação real, isso usaria uma API de geocodificação.
    """
    # Busca exata
    if name in KNOWN_LOCATIONS:
        return KNOWN_LOCATIONS[name]
    
    # Busca parcial (case insensitive)
    name_lower = name.lower()
    for loc_name, location in KNOWN_LOCATIONS.items():
        if name_lower in loc_name.lower():
            return location
    
    # Localização padrão se não encontrar (centro de SP)
    return Location(name=name, lat=-23.5505, lng=-46.6333)


# ===== ENDPOINTS DA API =====

@app.get("/health")
async def health() -> dict[str, str]:
    """Verifica se o serviço está funcionando"""
    return {"status": "ok", "service": "cesucar-matching"}


@app.get("/locations")
async def get_known_locations() -> dict[str, list[dict]]:
    """Retorna todas as localizações conhecidas"""
    return {
        "locations": [
            {"name": loc.name, "lat": loc.lat, "lng": loc.lng}
            for loc in KNOWN_LOCATIONS.values()
        ]
    }


@app.post("/match")
async def find_matching_rides(request: MatchRequest) -> dict[str, list[MatchResult]]:
    """
    Encontra caronas compatíveis usando algoritmo de matching inteligente.
    
    O algoritmo considera:
    1. Proximidade geográfica (origem e destino)
    2. Compatibilidade de preferências
    3. Compatibilidade de horário
    4. Avaliação do motorista
    
    Retorna as caronas ordenadas por score de compatibilidade.
    """
    results: list[MatchResult] = []
    
    # Preferências padrão se não especificadas
    passenger_prefs = request.preferences or Preferences()
    
    for ride in AVAILABLE_RIDES:
        # Verifica se há vagas disponíveis
        if ride.available_seats <= 0:
            continue
        
        # Verifica data se especificada
        if request.date and ride.date != request.date:
            continue
        
        # Calcula distância da origem do passageiro até a origem da carona
        origin_distance = haversine_distance(
            request.passenger_origin.lat,
            request.passenger_origin.lng,
            ride.origin.lat,
            ride.origin.lng
        )
        
        # Se muito longe do ponto de partida, ignora
        if origin_distance > request.max_distance_km:
            continue
        
        # Calcula distância do destino
        destination_distance = haversine_distance(
            request.passenger_destination.lat,
            request.passenger_destination.lng,
            ride.destination.lat,
            ride.destination.lng
        )
        
        # Se destino muito longe, penaliza mas não exclui
        destination_penalty = min(destination_distance * 10, 30)  # Máximo 30% de penalidade
        
        # Calcula compatibilidade de preferências
        pref_match = calculate_preference_match(passenger_prefs, ride.preferences)
        
        # Calcula compatibilidade de horário
        time_compat = calculate_time_compatibility(request.time or "", ride.time)
        
        # Calcula score final (0-100)
        # Pesos: proximidade (40%), preferências (25%), horário (25%), rating (10%)
        proximity_score = max(0, 100 - (origin_distance / request.max_distance_km) * 100)
        proximity_score -= destination_penalty
        
        match_score = (
            proximity_score * 0.40 +
            pref_match * 0.25 +
            time_compat * 0.25 +
            (ride.driver_rating / 5 * 100) * 0.10
        )
        
        results.append(MatchResult(
            ride=ride,
            match_score=round(match_score, 2),
            origin_distance_km=round(origin_distance, 2),
            destination_distance_km=round(destination_distance, 2),
            preference_match=round(pref_match, 2),
            time_compatibility=round(time_compat, 2)
        ))
    
    # Ordena por score (maior primeiro)
    results.sort(key=lambda x: x.match_score, reverse=True)
    
    return {"matches": results}


@app.post("/match/simple")
async def find_matching_rides_simple(
    origin: str,
    destination: str,
    date: Optional[str] = None,
    time: Optional[str] = None,
    max_distance: float = 2.0
) -> dict:
    """
    Versão simplificada do matching que aceita nomes de locais.
    
    Resolve os nomes para coordenadas e chama o algoritmo de matching.
    """
    # Resolve nomes para coordenadas
    origin_loc = resolve_location_name(origin)
    dest_loc = resolve_location_name(destination)
    
    if not origin_loc or not dest_loc:
        return {"error": "Não foi possível resolver os locais", "matches": []}
    
    # Cria a requisição e chama o matching
    request = MatchRequest(
        passenger_origin=origin_loc,
        passenger_destination=dest_loc,
        date=date,
        time=time,
        max_distance_km=max_distance
    )
    
    return await find_matching_rides(request)


@app.post("/optimize-route")
async def optimize_route(request: RouteOptimizationRequest) -> RouteOptimizationResult:
    """
    Otimiza uma rota com múltiplos waypoints.
    
    Usa um algoritmo guloso simples para encontrar a ordem de waypoints
    que minimiza a distância total percorrida.
    """
    if not request.waypoints:
        # Sem waypoints, retorna rota direta
        direct_distance = haversine_distance(
            request.origin.lat, request.origin.lng,
            request.destination.lat, request.destination.lng
        )
        return RouteOptimizationResult(
            optimized_waypoints=[],
            total_distance_km=round(direct_distance, 2),
            estimated_time_minutes=int(direct_distance * 3)  # ~20km/h média urbana
        )
    
    # Algoritmo guloso: sempre vai para o waypoint mais próximo
    remaining = list(request.waypoints)
    optimized = []
    current = request.origin
    total_distance = 0.0
    
    while remaining:
        # Encontra o waypoint mais próximo
        min_dist = float('inf')
        nearest = None
        nearest_idx = 0
        
        for i, wp in enumerate(remaining):
            dist = haversine_distance(current.lat, current.lng, wp.lat, wp.lng)
            if dist < min_dist:
                min_dist = dist
                nearest = wp
                nearest_idx = i
        
        if nearest:
            optimized.append(nearest)
            total_distance += min_dist
            current = nearest
            remaining.pop(nearest_idx)
    
    # Adiciona distância até o destino final
    total_distance += haversine_distance(
        current.lat, current.lng,
        request.destination.lat, request.destination.lng
    )
    
    return RouteOptimizationResult(
        optimized_waypoints=optimized,
        total_distance_km=round(total_distance, 2),
        estimated_time_minutes=int(total_distance * 3)
    )


@app.post("/recommend")
async def get_recommendations(request: RecommendationRequest) -> RecommendationResult:
    """
    Gera recomendações de caronas baseadas no histórico do usuário.
    
    Analisa:
    - Destinos mais frequentes
    - Horários mais utilizados
    - Padrões de uso (dias da semana, etc.)
    """
    # Analisa histórico para encontrar padrões
    destination_counts: dict[str, int] = {}
    time_counts: dict[str, int] = {}
    
    for ride in request.history:
        dest = ride.get("destination", "")
        time = ride.get("time", "")
        
        if dest:
            destination_counts[dest] = destination_counts.get(dest, 0) + 1
        if time:
            # Agrupa por faixa de horário
            hour = int(time.split(":")[0]) if ":" in time else 0
            if hour < 12:
                time_slot = "Manhã (6h-12h)"
            elif hour < 18:
                time_slot = "Tarde (12h-18h)"
            else:
                time_slot = "Noite (18h-23h)"
            time_counts[time_slot] = time_counts.get(time_slot, 0) + 1
    
    # Ordena por frequência
    frequent_destinations = sorted(
        destination_counts.keys(),
        key=lambda x: destination_counts[x],
        reverse=True
    )[:5]
    
    best_times = sorted(
        time_counts.keys(),
        key=lambda x: time_counts[x],
        reverse=True
    )
    
    # Gera rotas recomendadas baseadas nos padrões
    recommended_routes = []
    if frequent_destinations:
        for dest in frequent_destinations[:3]:
            if dest in KNOWN_LOCATIONS:
                recommended_routes.append({
                    "destination": dest,
                    "frequency": destination_counts[dest],
                    "suggested_time": best_times[0] if best_times else "Manhã (6h-12h)"
                })
    
    return RecommendationResult(
        recommended_routes=recommended_routes,
        frequent_destinations=frequent_destinations,
        best_times=best_times
    )


@app.get("/analytics/summary")
async def get_analytics_summary() -> dict:
    """
    Retorna um resumo analítico das caronas disponíveis.
    
    Útil para dashboards e visualizações.
    """
    total_rides = len(AVAILABLE_RIDES)
    total_seats = sum(r.available_seats for r in AVAILABLE_RIDES)
    avg_price = sum(r.price for r in AVAILABLE_RIDES) / total_rides if total_rides > 0 else 0
    avg_rating = sum(r.driver_rating for r in AVAILABLE_RIDES) / total_rides if total_rides > 0 else 0
    
    # Agrupa por destino
    destination_stats: dict[str, int] = {}
    for ride in AVAILABLE_RIDES:
        dest = ride.destination.name
        destination_stats[dest] = destination_stats.get(dest, 0) + 1
    
    return {
        "total_rides": total_rides,
        "total_available_seats": total_seats,
        "average_price": round(avg_price, 2),
        "average_driver_rating": round(avg_rating, 2),
        "rides_by_destination": destination_stats,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/rides")
async def get_all_rides() -> dict[str, list]:
    """Retorna todas as caronas disponíveis (compatibilidade com frontend)"""
    rides_data = []
    for ride in AVAILABLE_RIDES:
        rides_data.append({
            "id": ride.id,
            "driverId": ride.driver_id,
            "driverName": ride.driver_name,
            "driverRating": ride.driver_rating,
            "origin": ride.origin.name,
            "destination": ride.destination.name,
            "date": ride.date,
            "time": ride.time,
            "availableSeats": ride.available_seats,
            "totalSeats": ride.total_seats,
            "price": ride.price,
            "preferences": {
                "music": ride.preferences.music,
                "smoking": ride.preferences.smoking,
                "pets": ride.preferences.pets
            },
            "vehicle": {
                "model": "Honda Civic" if ride.driver_id == "1" else "VW Golf",
                "color": "Preto" if ride.driver_id == "1" else "Branco",
                "plate": "ABC-1234" if ride.driver_id == "1" else "XYZ-5678"
            }
        })
    return {"rides": rides_data}
