"""
Cesucar - Script de Análise de Dados
Gera estatísticas e métricas do sistema de caronas universitárias
"""

import random
from datetime import datetime, timedelta
from collections import defaultdict

# Dados simulados de caronas
def generate_mock_rides(num_rides: int = 100):
    """Gera dados simulados de caronas"""
    cities = ["Maringá", "Sarandi", "Paiçandu", "Mandaguari", "Marialva", "Astorga"]
    university = "CESUMAR"
    
    rides = []
    for i in range(num_rides):
        date = datetime.now() - timedelta(days=random.randint(0, 30))
        origin = random.choice(cities)
        passengers = random.randint(1, 4)
        distance_km = random.uniform(5, 30)
        price = round(distance_km * 0.5, 2)
        rating = round(random.uniform(3.5, 5.0), 1)
        
        rides.append({
            "id": i + 1,
            "date": date.strftime("%Y-%m-%d"),
            "origin": origin,
            "destination": university,
            "passengers": passengers,
            "distance_km": round(distance_km, 1),
            "price": price,
            "rating": rating,
            "completed": random.random() > 0.1  # 90% taxa de conclusão
        })
    
    return rides

def calculate_statistics(rides: list):
    """Calcula estatísticas gerais das caronas"""
    total_rides = len(rides)
    completed_rides = sum(1 for r in rides if r["completed"])
    total_passengers = sum(r["passengers"] for r in rides)
    total_distance = sum(r["distance_km"] for r in rides)
    total_revenue = sum(r["price"] for r in rides if r["completed"])
    avg_rating = sum(r["rating"] for r in rides) / total_rides
    
    return {
        "total_rides": total_rides,
        "completed_rides": completed_rides,
        "completion_rate": round(completed_rides / total_rides * 100, 1),
        "total_passengers": total_passengers,
        "total_distance_km": round(total_distance, 1),
        "total_revenue": round(total_revenue, 2),
        "avg_rating": round(avg_rating, 2),
        "avg_passengers_per_ride": round(total_passengers / total_rides, 1)
    }

def calculate_environmental_impact(rides: list):
    """Calcula impacto ambiental positivo das caronas compartilhadas"""
    # Média de emissão de CO2 por km (carro comum): 120g/km
    # Com carona, dividimos entre os passageiros
    CO2_PER_KM = 0.12  # kg por km
    
    total_distance = sum(r["distance_km"] for r in rides if r["completed"])
    total_passengers = sum(r["passengers"] for r in rides if r["completed"])
    
    # CO2 que seria emitido se cada pessoa fosse sozinha
    co2_individual = total_distance * total_passengers * CO2_PER_KM
    
    # CO2 real emitido (apenas um carro por viagem)
    completed_rides = sum(1 for r in rides if r["completed"])
    co2_shared = total_distance * CO2_PER_KM
    
    # Economia de CO2
    co2_saved = co2_individual - co2_shared
    
    # Equivalência em árvores (uma árvore absorve ~22kg de CO2 por ano)
    trees_equivalent = co2_saved / 22
    
    return {
        "co2_saved_kg": round(co2_saved, 2),
        "trees_equivalent": round(trees_equivalent, 2),
        "individual_trips_avoided": total_passengers - completed_rides,
        "fuel_saved_liters": round(total_distance * 0.08 * (total_passengers - 1) / total_passengers, 2)
    }

def get_popular_routes(rides: list, top_n: int = 5):
    """Identifica as rotas mais populares"""
    route_counts = defaultdict(int)
    
    for ride in rides:
        route = f"{ride['origin']} → {ride['destination']}"
        route_counts[route] += 1
    
    sorted_routes = sorted(route_counts.items(), key=lambda x: x[1], reverse=True)
    return sorted_routes[:top_n]

def get_peak_hours():
    """Retorna horários de pico simulados"""
    return {
        "morning_peak": "06:30 - 08:00",
        "evening_peak": "17:30 - 19:00",
        "busiest_day": "Segunda-feira",
        "quietest_day": "Sábado"
    }

def generate_report():
    """Gera relatório completo de análise"""
    print("=" * 60)
    print("        CESUCAR - Relatório de Análise de Dados")
    print("=" * 60)
    print(f"Data do relatório: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print()
    
    # Gerar dados
    rides = generate_mock_rides(150)
    
    # Estatísticas gerais
    stats = calculate_statistics(rides)
    print("📊 ESTATÍSTICAS GERAIS")
    print("-" * 40)
    print(f"  Total de caronas: {stats['total_rides']}")
    print(f"  Caronas concluídas: {stats['completed_rides']}")
    print(f"  Taxa de conclusão: {stats['completion_rate']}%")
    print(f"  Total de passageiros: {stats['total_passengers']}")
    print(f"  Distância total: {stats['total_distance_km']} km")
    print(f"  Receita total: R$ {stats['total_revenue']:.2f}")
    print(f"  Avaliação média: {stats['avg_rating']} ⭐")
    print(f"  Média de passageiros/carona: {stats['avg_passengers_per_ride']}")
    print()
    
    # Impacto ambiental
    impact = calculate_environmental_impact(rides)
    print("🌱 IMPACTO AMBIENTAL")
    print("-" * 40)
    print(f"  CO2 economizado: {impact['co2_saved_kg']} kg")
    print(f"  Equivalente em árvores: {impact['trees_equivalent']} árvores/ano")
    print(f"  Viagens individuais evitadas: {impact['individual_trips_avoided']}")
    print(f"  Combustível economizado: {impact['fuel_saved_liters']} litros")
    print()
    
    # Rotas populares
    popular_routes = get_popular_routes(rides)
    print("🗺️  ROTAS MAIS POPULARES")
    print("-" * 40)
    for i, (route, count) in enumerate(popular_routes, 1):
        print(f"  {i}. {route}: {count} caronas")
    print()
    
    # Horários de pico
    peak = get_peak_hours()
    print("⏰ HORÁRIOS DE PICO")
    print("-" * 40)
    print(f"  Pico da manhã: {peak['morning_peak']}")
    print(f"  Pico da tarde: {peak['evening_peak']}")
    print(f"  Dia mais movimentado: {peak['busiest_day']}")
    print(f"  Dia mais tranquilo: {peak['quietest_day']}")
    print()
    
    print("=" * 60)
    print("        Relatório gerado com sucesso!")
    print("=" * 60)
    
    return {
        "statistics": stats,
        "environmental_impact": impact,
        "popular_routes": popular_routes,
        "peak_hours": peak
    }

if __name__ == "__main__":
    report = generate_report()
