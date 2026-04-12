'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Navigation, Check } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Locais sugeridos
const suggestedLocations = [
  'CESU - Campus Centro',
  'CESU - Campus Sul',
  'CESU - Campus Norte',
  'Estação Pinheiros',
  'Metrô Consolação',
  'Terminal Barra Funda',
  'Estação Vila Madalena'
]

export default function DriverRoutePage() {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const [showDestSuggestions, setShowDestSuggestions] = useState(false)

  const handleContinue = () => {
    if (!origin.trim() || !destination.trim()) {
      return
    }
    router.push('/driver/home')
  }

  const filteredOrigins = suggestedLocations.filter(loc =>
    loc.toLowerCase().includes(origin.toLowerCase())
  )

  const filteredDests = suggestedLocations.filter(loc =>
    loc.toLowerCase().includes(destination.toLowerCase())
  )

  return (
    <main className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/driver/documents">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <Logo size="sm" />
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Navigation className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Defina sua Rota</CardTitle>
            <CardDescription>
              Informe o trajeto principal que você faz até a faculdade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visualização da rota */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-accent" />
                <div className="h-16 w-0.5 bg-border" />
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="flex-1 space-y-4">
                {/* Origem */}
                <div className="relative">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                    <Input
                      placeholder="Ponto de partida"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      onFocus={() => setShowOriginSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                      className="pl-10"
                    />
                  </div>
                  {showOriginSuggestions && filteredOrigins.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                      {filteredOrigins.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setOrigin(loc)
                            setShowOriginSuggestions(false)
                          }}
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destino */}
                <div className="relative">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <Input
                      placeholder="Destino final"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      onFocus={() => setShowDestSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                      className="pl-10"
                    />
                  </div>
                  {showDestSuggestions && filteredDests.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                      {filteredDests.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setDestination(loc)
                            setShowDestSuggestions(false)
                          }}
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Você poderá ajustar sua rota e criar ofertas de carona específicas 
                depois de finalizar o cadastro.
              </p>
            </div>

            <Button
              onClick={handleContinue}
              disabled={!origin.trim() || !destination.trim()}
              className="h-12 w-full text-base font-semibold"
            >
              <Check className="mr-2 h-4 w-4" />
              Finalizar cadastro
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
