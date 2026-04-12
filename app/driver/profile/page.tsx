'use client'

import { useRouter } from 'next/navigation'
import { Mail, Phone, Car, LogOut, ChevronRight, Settings, Bell, Shield, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StarRating } from '@/components/star-rating'

// Mock driver data
const mockDriver = {
  name: 'João Silva',
  email: 'joao@email.com',
  phone: '(11) 99999-1234',
  rating: 4.8,
  totalRides: 45,
  vehicle: {
    model: 'Honda Civic',
    color: 'Preto',
    plate: 'ABC-1234',
    year: '2022'
  }
}

export default function DriverProfilePage() {
  const router = useRouter()

  const menuItems = [
    { icon: Settings, label: 'Configurações', href: '#' },
    { icon: Bell, label: 'Notificações', href: '#' },
    { icon: Shield, label: 'Privacidade e Segurança', href: '#' },
    { icon: User, label: 'Mudar para Passageiro', href: '/passenger/home' },
  ]

  const handleLogout = () => {
    router.push('/login')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Profile Header */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {mockDriver.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{mockDriver.name}</h1>
              <p className="text-muted-foreground">Motorista</p>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <StarRating value={mockDriver.rating} readonly size="sm" />
                  <span className="text-sm font-medium text-foreground">
                    {mockDriver.rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {mockDriver.totalRides} caronas
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="divide-y divide-border p-0">
          <div className="flex items-center gap-4 p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{mockDriver.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium text-foreground">{mockDriver.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Meu Veículo</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Modelo</p>
              <p className="font-medium text-foreground">{mockDriver.vehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cor</p>
              <p className="font-medium text-foreground">{mockDriver.vehicle.color}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Placa</p>
              <p className="font-medium text-foreground">{mockDriver.vehicle.plate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ano</p>
              <p className="font-medium text-foreground">{mockDriver.vehicle.year}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="divide-y divide-border p-0">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={() => router.push(item.href)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
    </div>
  )
}
