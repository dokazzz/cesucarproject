'use client'

import { useState } from 'react'
import { Plus, MapPin, Clock, Users, X, Loader2, Calendar, Music, Cigarette, Dog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { createRide } from '@/lib/api'

// Passageiros interessados mockados
const mockInterestedPassengers = [
  { id: '1', name: 'Maria Santos', rating: 4.9 },
  { id: '2', name: 'Ana Oliveira', rating: 4.7 },
  { id: '3', name: 'Carlos Lima', rating: 4.8 },
]

// Minhas caronas mockadas
const myRides = [
  {
    id: '1',
    origin: 'Estação Pinheiros',
    destination: 'CESU - Campus Centro',
    date: '2026-04-13',
    time: '07:30',
    availableSeats: 2,
    totalSeats: 4,
    interestedCount: 3
  },
  {
    id: '2',
    origin: 'Estação Pinheiros',
    destination: 'CESU - Campus Centro',
    date: '2026-04-14',
    time: '07:30',
    availableSeats: 4,
    totalSeats: 4,
    interestedCount: 1
  }
]

export default function DriverHomePage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPassengersModal, setShowPassengersModal] = useState(false)
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [newRide, setNewRide] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    seats: '4',
    price: '',
    music: true,
    smoking: false,
    pets: false
  })

  const handleCreateRide = async () => {
    setCreating(true)
    try {
      await createRide({
        origin: newRide.origin,
        destination: newRide.destination,
        date: newRide.date,
        time: newRide.time,
        totalSeats: parseInt(newRide.seats),
        price: parseFloat(newRide.price),
        preferences: {
          music: newRide.music,
          smoking: newRide.smoking,
          pets: newRide.pets
        }
      })
      setShowCreateModal(false)
      setNewRide({
        origin: '',
        destination: '',
        date: '',
        time: '',
        seats: '4',
        price: '',
        music: true,
        smoking: false,
        pets: false
      })
      alert('Carona criada com sucesso!')
    } finally {
      setCreating(false)
    }
  }

  const handleViewPassengers = (rideId: string) => {
    setSelectedRideId(rideId)
    setShowPassengersModal(true)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Caronas</h1>
          <p className="text-muted-foreground">Gerencie suas ofertas de carona</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Carona
        </Button>
      </div>

      {/* Lista de caronas */}
      <div className="space-y-4">
        {myRides.map((ride) => (
          <Card key={ride.id} className="border-0 shadow-md">
            <CardContent className="p-4">
              {/* Rota */}
              <div className="mb-4 flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <div className="h-8 w-0.5 bg-border" />
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Origem</p>
                    <p className="font-medium text-foreground">{ride.origin}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Destino</p>
                    <p className="font-medium text-foreground">{ride.destination}</p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(ride.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{ride.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{ride.availableSeats}/{ride.totalSeats} vagas</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleViewPassengers(ride.id)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {ride.interestedCount} interessados
                </Button>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Criar Carona */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nova Carona</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Origem</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="De onde?"
                    value={newRide.origin}
                    onChange={(e) => setNewRide(r => ({ ...r, origin: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Destino</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Para onde?"
                    value={newRide.destination}
                    onChange={(e) => setNewRide(r => ({ ...r, destination: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <Input
                    type="date"
                    value={newRide.date}
                    onChange={(e) => setNewRide(r => ({ ...r, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário</label>
                  <Input
                    type="time"
                    value={newRide.time}
                    onChange={(e) => setNewRide(r => ({ ...r, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vagas</label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={newRide.seats}
                    onChange={(e) => setNewRide(r => ({ ...r, seats: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço (R$)</label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="0,00"
                    value={newRide.price}
                    onChange={(e) => setNewRide(r => ({ ...r, price: e.target.value }))}
                  />
                </div>
              </div>

              {/* Preferências */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferências</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRide(r => ({ ...r, music: !r.music }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                      newRide.music
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <Music className="h-3.5 w-3.5" />
                    Música
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRide(r => ({ ...r, smoking: !r.smoking }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                      newRide.smoking
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <Cigarette className="h-3.5 w-3.5" />
                    Fumante
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRide(r => ({ ...r, pets: !r.pets }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                      newRide.pets
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <Dog className="h-3.5 w-3.5" />
                    Pets
                  </button>
                </div>
              </div>

              <Button
                onClick={handleCreateRide}
                disabled={creating || !newRide.origin || !newRide.destination || !newRide.date || !newRide.time}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Carona'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Passageiros Interessados */}
      {showPassengersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Passageiros Interessados</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPassengersModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockInterestedPassengers.map((passenger) => (
                <div
                  key={passenger.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {passenger.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{passenger.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Avaliação: {passenger.rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Recusar
                    </Button>
                    <Button size="sm">
                      Aceitar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
