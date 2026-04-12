'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Car } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DriverRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    vehicleModel: '',
    vehicleColor: '',
    vehiclePlate: '',
    vehicleYear: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const formatPlate = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length <= 3) return clean
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`
  }

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlate(e.target.value)
    setFormData(prev => ({ ...prev, vehiclePlate: formatted }))
    if (errors.vehiclePlate) {
      setErrors(prev => ({ ...prev, vehiclePlate: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = 'Modelo é obrigatório'
    }
    if (!formData.vehicleColor.trim()) {
      newErrors.vehicleColor = 'Cor é obrigatória'
    }
    if (!formData.vehiclePlate.trim()) {
      newErrors.vehiclePlate = 'Placa é obrigatória'
    } else if (!/^[A-Z]{3}-\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(formData.vehiclePlate)) {
      newErrors.vehiclePlate = 'Formato: ABC-1234 ou ABC1D23'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (!validateForm()) return
    router.push('/driver/documents')
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
          <div className="h-1 flex-1 rounded-full bg-muted" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Dados do Veículo</CardTitle>
            <CardDescription>
              Informe os dados do veículo que você usará nas caronas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="vehicleModel" className="text-sm font-medium text-foreground">
                Modelo do veículo
              </label>
              <Input
                id="vehicleModel"
                name="vehicleModel"
                placeholder="Ex: Honda Civic, VW Golf"
                value={formData.vehicleModel}
                onChange={handleChange}
                className={errors.vehicleModel ? 'border-destructive' : ''}
              />
              {errors.vehicleModel && (
                <p className="text-xs text-destructive">{errors.vehicleModel}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="vehicleColor" className="text-sm font-medium text-foreground">
                  Cor
                </label>
                <Input
                  id="vehicleColor"
                  name="vehicleColor"
                  placeholder="Ex: Preto"
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  className={errors.vehicleColor ? 'border-destructive' : ''}
                />
                {errors.vehicleColor && (
                  <p className="text-xs text-destructive">{errors.vehicleColor}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicleYear" className="text-sm font-medium text-foreground">
                  Ano (opcional)
                </label>
                <Input
                  id="vehicleYear"
                  name="vehicleYear"
                  placeholder="Ex: 2022"
                  value={formData.vehicleYear}
                  onChange={handleChange}
                  maxLength={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="vehiclePlate" className="text-sm font-medium text-foreground">
                Placa do veículo
              </label>
              <Input
                id="vehiclePlate"
                name="vehiclePlate"
                placeholder="ABC-1234"
                value={formData.vehiclePlate}
                onChange={handlePlateChange}
                maxLength={8}
                className={errors.vehiclePlate ? 'border-destructive' : ''}
              />
              {errors.vehiclePlate && (
                <p className="text-xs text-destructive">{errors.vehiclePlate}</p>
              )}
            </div>

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
