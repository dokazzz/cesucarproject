'use client'

import { Clock, Users, Star, Music, Cigarette, Dog, Car, Zap, Navigation } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Ride } from '@/lib/mock-data'

interface MatchInfo {
  matchScore: number
  originDistanceKm: number
  preferenceMatch: number
}

interface RideCardProps {
  ride: Ride
  onSelect?: (ride: Ride) => void
  showActions?: boolean
  matchInfo?: MatchInfo  // Informações do matching inteligente
}

export function RideCard({ ride, onSelect, showActions = true, matchInfo }: RideCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        {/* Score de Matching (se disponível) */}
        {matchInfo && (
          <div className="mb-4 rounded-lg bg-accent/10 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Compatibilidade</span>
              </div>
              <span className="text-lg font-bold text-accent">{matchInfo.matchScore.toFixed(0)}%</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                <span>{matchInfo.originDistanceKm.toFixed(1)} km de você</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{matchInfo.preferenceMatch.toFixed(0)}% preferências</span>
              </div>
            </div>
          </div>
        )}

        {/* Motorista info */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {ride.driverName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{ride.driverName}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span>{ride.driverRating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              R$ {ride.price.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">por pessoa</p>
          </div>
        </div>

        {/* Rota */}
        <div className="mb-4 space-y-2">
          <div className="flex items-start gap-3">
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
        </div>

        {/* Info */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{ride.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{ride.availableSeats} vagas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Car className="h-4 w-4" />
            <span>{ride.vehicle.model}</span>
          </div>
        </div>

        {/* Preferências */}
        <div className="mb-4 flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs',
              ride.preferences.music
                ? 'bg-accent/10 text-accent'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Music className="h-3 w-3" />
            Música
          </span>
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs',
              !ride.preferences.smoking
                ? 'bg-accent/10 text-accent'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            <Cigarette className="h-3 w-3" />
            {ride.preferences.smoking ? 'Fumante' : 'Não fumante'}
          </span>
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs',
              ride.preferences.pets
                ? 'bg-accent/10 text-accent'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Dog className="h-3 w-3" />
            Pets
          </span>
        </div>

        {/* Ações */}
        {showActions && (
          <Button
            className="w-full"
            onClick={() => onSelect?.(ride)}
          >
            Solicitar Carona
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
