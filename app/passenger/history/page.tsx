'use client'

import { useState, useEffect } from 'react'
import { MapPin, Calendar, Clock, CheckCircle, XCircle, Star, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StarRating } from '@/components/star-rating'
import { getRideHistory, submitRating } from '@/lib/api'
import type { RideHistory } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function PassengerHistoryPage() {
  const [history, setHistory] = useState<RideHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingRide, setRatingRide] = useState<string | null>(null)
  const [pendingRating, setPendingRating] = useState(0)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await getRideHistory()
      setHistory(data)
    } finally {
      setLoading(false)
    }
  }

  const handleRate = async (rideId: string) => {
    if (pendingRating === 0) return
    
    await submitRating(rideId, pendingRating)
    setHistory(prev =>
      prev.map(ride =>
        ride.id === rideId ? { ...ride, rating: pendingRating } : ride
      )
    )
    setRatingRide(null)
    setPendingRating(0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Histórico de Caronas</h1>

      {history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-center text-muted-foreground">
              Você ainda não tem caronas no histórico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((ride) => (
            <Card key={ride.id} className="border-0 shadow-md">
              <CardContent className="p-4">
                {/* Status */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ride.status === 'completed' ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-accent" />
                        <span className="text-sm font-medium text-accent">Concluída</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="text-sm font-medium text-destructive">Cancelada</span>
                      </>
                    )}
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    R$ {ride.price.toFixed(2)}
                  </span>
                </div>

                {/* Rota */}
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <div className="h-6 w-0.5 bg-border" />
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-foreground">{ride.origin}</p>
                    <p className="text-sm font-medium text-foreground">{ride.destination}</p>
                  </div>
                </div>

                {/* Info */}
                <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(ride.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{ride.time}</span>
                  </div>
                </div>

                {/* Motorista */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {ride.partnerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{ride.partnerName}</p>
                      <p className="text-xs text-muted-foreground">Motorista</p>
                    </div>
                  </div>

                  {/* Avaliação */}
                  {ride.status === 'completed' && (
                    <div>
                      {ride.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-foreground">{ride.rating}</span>
                        </div>
                      ) : ratingRide === ride.id ? (
                        <div className="flex flex-col items-end gap-2">
                          <StarRating
                            value={pendingRating}
                            onChange={setPendingRating}
                            size="sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRatingRide(null)
                                setPendingRating(0)
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRate(ride.id)}
                              disabled={pendingRating === 0}
                            >
                              Avaliar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRatingRide(ride.id)}
                        >
                          <Star className="mr-1 h-4 w-4" />
                          Avaliar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
