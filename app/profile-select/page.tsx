'use client'

import { useRouter } from 'next/navigation'
import { User, Car, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function ProfileSelectPage() {
  const router = useRouter()

  const profiles = [
    {
      id: 'passenger',
      title: 'Passageiro',
      description: 'Encontre caronas e economize no trajeto até a faculdade',
      icon: User,
      href: '/passenger/register',
      features: ['Buscar caronas disponíveis', 'Filtrar por preferências', 'Avaliar motoristas']
    },
    {
      id: 'driver',
      title: 'Motorista',
      description: 'Ofereça caronas e divida os custos da viagem',
      icon: Car,
      href: '/driver/register',
      features: ['Criar ofertas de carona', 'Definir rotas e horários', 'Ganhar avaliações']
    }
  ]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-bold text-foreground md:text-3xl">
            Como você quer usar o Cesucar?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Escolha seu perfil para continuar. Você pode alternar depois.
          </p>
        </div>

        {/* Profile Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => {
            const Icon = profile.icon
            return (
              <Card
                key={profile.id}
                className={cn(
                  'group cursor-pointer border-2 transition-all duration-200',
                  'hover:border-primary hover:shadow-lg'
                )}
                onClick={() => router.push(profile.href)}
              >
                <CardContent className="p-6">
                  {/* Icon */}
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary">
                    <Icon className="h-7 w-7 text-primary transition-colors group-hover:text-primary-foreground" />
                  </div>

                  {/* Title & Description */}
                  <h2 className="mb-2 text-xl font-bold text-foreground">
                    {profile.title}
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {profile.description}
                  </p>

                  {/* Features */}
                  <ul className="mb-4 space-y-2">
                    {profile.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    Continuar como {profile.title.toLowerCase()}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
