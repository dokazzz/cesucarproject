'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin, SlidersHorizontal, X, Loader2, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { RideCard } from '@/components/ride-card'
import { getRides, requestRide, getSmartMatches, checkPythonHealth } from '@/lib/api'
import type { Ride } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// Tipo para resultados do matching inteligente
interface MatchResult {
  ride: Ride
  matchScore: number
  originDistanceKm: number
  preferenceMatch: number
}

export default function PassengerHomePage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [useSmartMatch, setUseSmartMatch] = useState(true)
  const [pythonAvailable, setPythonAvailable] = useState(false)
  const [filters, setFilters] = useState({
    time: '',
    music: false,
    noSmoking: false,
    pets: false
  })
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    // Verifica se o backend Python está disponível
    checkPythonHealth().then(setPythonAvailable)
    loadRides()
  }, [])

  const loadRides = async () => {
    setLoading(true)
    try {
      const data = await getRides({
        origin: origin || undefined,
        destination: destination || undefined
      })
      setRides(data)
      setMatchResults([]) // Limpa resultados de matching quando carrega todas
    } finally {
      setLoading(false)
    }
  }

  const handleSmartSearch = async () => {
    if (!origin || !destination) {
      loadRides()
      return
    }

    setLoading(true)
    try {
      const result = await getSmartMatches({
        origin,
        destination,
        time: filters.time || undefined,
        preferences: {
          music: filters.music,
          smoking: !filters.noSmoking,
          pets: filters.pets
        }
      })

      if (result.matches && result.matches.length > 0) {
        // Converte os resultados do Python para o formato do frontend
        const mappedResults: MatchResult[] = result.matches.map((m) => ({
          ride: {
            id: m.ride.id,
            driverId: m.ride.driver_id,
            driverName: m.ride.driver_name,
            driverRating: m.ride.driver_rating,
            origin: m.ride.origin.name,
            destination: m.ride.destination.name,
            date: m.ride.date,
            time: m.ride.time,
            availableSeats: m.ride.available_seats,
            totalSeats: m.ride.total_seats,
            price: m.ride.price,
            preferences: {
              music: m.ride.preferences.music,
              smoking: m.ride.preferences.smoking,
              pets: m.ride.preferences.pets
            },
            vehicle: {
              model: m.ride.driver_id === '1' ? 'Honda Civic' : 'VW Golf',
              color: m.ride.driver_id === '1' ? 'Preto' : 'Branco',
              plate: m.ride.driver_id === '1' ? 'ABC-1234' : 'XYZ-5678'
            },
            passengers: []
          } as Ride,
          matchScore: m.match_score,
          originDistanceKm: m.origin_distance_km,
          preferenceMatch: m.preference_match
        }))
        setMatchResults(mappedResults)
        setRides([])
      } else {
        // Fallback para busca normal
        await loadRides()
      }
    } catch (error) {
      console.error('Erro no smart search:', error)
      await loadRides()
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (useSmartMatch && pythonAvailable && origin && destination) {
      handleSmartSearch()
    } else {
      loadRides()
    }
  }

  const handleSelectRide = (ride: Ride) => {
    setSelectedRide(ride)
  }

  const handleRequestRide = async () => {
    if (!selectedRide) return
    
    setRequesting(true)
    try {
      const result = await requestRide(selectedRide.id, '2')
      if (result.success) {
        // Mostra confirmação
        alert('Carona solicitada com sucesso! O motorista irá confirmar.')
        setSelectedRide(null)
        loadRides()
      } else {
        alert(result.error)
      }
    } finally {
      setRequesting(false)
    }
  }

  const filteredRides = rides.filter(ride => {
    if (filters.time && ride.time < filters.time) return false
    if (filters.music && !ride.preferences.music) return false
    if (filters.noSmoking && ride.preferences.smoking) return false
    if (filters.pets && !ride.preferences.pets) return false
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Search Section */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                <div className="h-10 w-0.5 bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="De onde?"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Para onde?"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                {useSmartMatch && pythonAvailable ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Busca Inteligente
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar caronas
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Toggle Matching Inteligente */}
            {pythonAvailable && (
              <div className="flex items-center justify-between rounded-lg bg-accent/10 p-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Matching Inteligente</p>
                    <p className="text-xs text-muted-foreground">Algoritmo Python de compatibilidade</p>
                  </div>
                </div>
                <button
                  onClick={() => setUseSmartMatch(!useSmartMatch)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    useSmartMatch ? 'bg-accent' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform',
                      useSmartMatch ? 'left-5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm font-medium text-foreground">Filtros</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilters(f => ({ ...f, music: !f.music }))}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm transition-colors',
                      filters.music
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    Com música
                  </button>
                  <button
                    onClick={() => setFilters(f => ({ ...f, noSmoking: !f.noSmoking }))}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm transition-colors',
                      filters.noSmoking
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    Não fumante
                  </button>
                  <button
                    onClick={() => setFilters(f => ({ ...f, pets: !f.pets }))}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm transition-colors',
                      filters.pets
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    Aceita pets
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Horário a partir de:</label>
                  <Input
                    type="time"
                    value={filters.time}
                    onChange={(e) => setFilters(f => ({ ...f, time: e.target.value }))}
                    className="w-32"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {matchResults.length > 0 ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Melhores correspondências
              </span>
            ) : (
              'Caronas disponíveis'
            )}
          </h2>
          <span className="text-sm text-muted-foreground">
            {matchResults.length > 0 ? matchResults.length : filteredRides.length} encontradas
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : matchResults.length > 0 ? (
          // Resultados do Matching Inteligente
          <div className="space-y-4">
            {matchResults.map((result) => (
              <RideCard
                key={result.ride.id}
                ride={result.ride}
                onSelect={handleSelectRide}
                matchInfo={{
                  matchScore: result.matchScore,
                  originDistanceKm: result.originDistanceKm,
                  preferenceMatch: result.preferenceMatch
                }}
              />
            ))}
          </div>
        ) : filteredRides.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-center text-muted-foreground">
                Nenhuma carona encontrada.
                <br />
                Tente ajustar os filtros.
              </p>
            </CardContent>
          </Card>
        ) : (
          // Resultados normais
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onSelect={handleSelectRide}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center">
          <Card className="w-full max-w-md animate-in slide-in-from-bottom-4">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Confirmar solicitação</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedRide(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Motorista</span>
                  <span className="font-medium text-foreground">{selectedRide.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origem</span>
                  <span className="font-medium text-foreground">{selectedRide.origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino</span>
                  <span className="font-medium text-foreground">{selectedRide.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium text-foreground">{selectedRide.time}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {selectedRide.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedRide(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRequestRide}
                  disabled={requesting}
                >
                  {requesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
