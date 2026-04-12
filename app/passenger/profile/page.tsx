'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Star, Car, LogOut, ChevronRight, Settings, Bell, Shield } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StarRating } from '@/components/star-rating'

// Mock user data
const mockUser = {
  name: 'Maria Santos',
  email: 'maria@email.com',
  phone: '(11) 98888-5678',
  rating: 4.9,
  totalRides: 32
}

export default function PassengerProfilePage() {
  const router = useRouter()

  const menuItems = [
    { icon: Settings, label: 'Configurações', href: '#' },
    { icon: Bell, label: 'Notificações', href: '#' },
    { icon: Shield, label: 'Privacidade e Segurança', href: '#' },
    { icon: Car, label: 'Mudar para Motorista', href: '/driver/register' },
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
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{mockUser.name}</h1>
              <p className="text-muted-foreground">Passageiro</p>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <StarRating value={mockUser.rating} readonly size="sm" />
                  <span className="text-sm font-medium text-foreground">
                    {mockUser.rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {mockUser.totalRides} caronas
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardContent className="divide-y divide-border p-0">
          <div className="flex items-center gap-4 p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{mockUser.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium text-foreground">{mockUser.phone}</p>
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
