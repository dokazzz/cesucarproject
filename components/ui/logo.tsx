import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 28, text: 'text-2xl' },
    lg: { icon: 40, text: 'text-4xl' }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center justify-center rounded-xl bg-primary p-2">
        <Car className="text-primary-foreground" size={sizes[size].icon} />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground', sizes[size].text)}>
          Cesucar
        </span>
      )}
    </div>
  )
}
