'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Music, Cigarette, Dog, Check } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Preference {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const preferences: Preference[] = [
  {
    id: 'music',
    label: 'Música',
    description: 'Gosto de ouvir música durante a viagem',
    icon: Music
  },
  {
    id: 'smoking',
    label: 'Fumante',
    description: 'Aceito caronas onde é permitido fumar',
    icon: Cigarette
  },
  {
    id: 'pets',
    label: 'Pets',
    description: 'Aceito caronas com animais de estimação',
    icon: Dog
  }
]

export default function PassengerRegisterPage() {
  const router = useRouter()
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(['music'])

  const togglePreference = (id: string) => {
    setSelectedPreferences(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    )
  }

  const handleContinue = () => {
    // Salvar preferências e ir para validação de identidade
    router.push('/passenger/verify')
  }

  return (
    <main className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile-select">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <Logo size="sm" />
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-muted" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Suas Preferências</CardTitle>
            <CardDescription>
              Selecione suas preferências para encontrar caronas ideais para você
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preferences.map((pref) => {
              const Icon = pref.icon
              const isSelected = selectedPreferences.includes(pref.id)
              
              return (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() => togglePreference(pref.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                      isSelected ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{pref.label}</p>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                  </div>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                </button>
              )
            })}

            <div className="pt-4">
              <Button
                onClick={handleContinue}
                className="h-12 w-full text-base font-semibold"
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
