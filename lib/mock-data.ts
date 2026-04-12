// Dados mockados para simular o backend

export interface User {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  rating: number
  totalRides: number
  type: 'passenger' | 'driver'
}

export interface Ride {
  id: string
  driverId: string
  driverName: string
  driverAvatar?: string
  driverRating: number
  origin: string
  destination: string
  date: string
  time: string
  availableSeats: number
  totalSeats: number
  price: number
  preferences: {
    music: boolean
    smoking: boolean
    pets: boolean
  }
  vehicle: {
    model: string
    color: string
    plate: string
  }
  passengers: string[]
}

export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  isOwn: boolean
}

export interface RideHistory {
  id: string
  origin: string
  destination: string
  date: string
  time: string
  status: 'completed' | 'cancelled'
  rating?: number
  partnerName: string
  partnerAvatar?: string
  price: number
}

// Usuários mockados
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 99999-1234',
    rating: 4.8,
    totalRides: 45,
    type: 'driver'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '(11) 98888-5678',
    rating: 4.9,
    totalRides: 32,
    type: 'passenger'
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro@email.com',
    phone: '(11) 97777-9012',
    rating: 4.7,
    totalRides: 28,
    type: 'driver'
  }
]

// Caronas disponíveis
export const mockRides: Ride[] = [
  {
    id: '1',
    driverId: '1',
    driverName: 'João Silva',
    driverRating: 4.8,
    origin: 'Estação Pinheiros',
    destination: 'CESU - Campus Centro',
    date: '2026-04-13',
    time: '07:30',
    availableSeats: 2,
    totalSeats: 4,
    price: 8.00,
    preferences: { music: true, smoking: false, pets: false },
    vehicle: { model: 'Honda Civic', color: 'Preto', plate: 'ABC-1234' },
    passengers: ['2']
  },
  {
    id: '2',
    driverId: '3',
    driverName: 'Pedro Costa',
    driverRating: 4.7,
    origin: 'Metrô Consolação',
    destination: 'CESU - Campus Centro',
    date: '2026-04-13',
    time: '08:00',
    availableSeats: 3,
    totalSeats: 4,
    price: 6.50,
    preferences: { music: true, smoking: false, pets: true },
    vehicle: { model: 'VW Golf', color: 'Branco', plate: 'XYZ-5678' },
    passengers: []
  },
  {
    id: '3',
    driverId: '1',
    driverName: 'João Silva',
    driverRating: 4.8,
    origin: 'Terminal Barra Funda',
    destination: 'CESU - Campus Sul',
    date: '2026-04-13',
    time: '18:30',
    availableSeats: 4,
    totalSeats: 4,
    price: 10.00,
    preferences: { music: false, smoking: false, pets: false },
    vehicle: { model: 'Honda Civic', color: 'Preto', plate: 'ABC-1234' },
    passengers: []
  },
  {
    id: '4',
    driverId: '3',
    driverName: 'Pedro Costa',
    driverRating: 4.7,
    origin: 'Estação Vila Madalena',
    destination: 'CESU - Campus Centro',
    date: '2026-04-14',
    time: '07:00',
    availableSeats: 1,
    totalSeats: 4,
    price: 7.00,
    preferences: { music: true, smoking: false, pets: false },
    vehicle: { model: 'VW Golf', color: 'Branco', plate: 'XYZ-5678' },
    passengers: ['2']
  }
]

// Mensagens mockadas
export const mockMessages: Message[] = [
  { id: '1', senderId: '1', content: 'Olá! Vou estar no ponto às 7:25, ok?', timestamp: '07:20', isOwn: false },
  { id: '2', senderId: '2', content: 'Perfeito! Estarei lá.', timestamp: '07:21', isOwn: true },
  { id: '3', senderId: '1', content: 'Ótimo! Estou num Civic preto.', timestamp: '07:22', isOwn: false },
  { id: '4', senderId: '2', content: 'Combinado! Obrigada!', timestamp: '07:23', isOwn: true },
]

// Histórico de caronas
export const mockHistory: RideHistory[] = [
  {
    id: '1',
    origin: 'Estação Pinheiros',
    destination: 'CESU - Campus Centro',
    date: '2026-04-10',
    time: '07:30',
    status: 'completed',
    rating: 5,
    partnerName: 'João Silva',
    price: 8.00
  },
  {
    id: '2',
    origin: 'Metrô Consolação',
    destination: 'CESU - Campus Centro',
    date: '2026-04-09',
    time: '08:00',
    status: 'completed',
    rating: 4,
    partnerName: 'Pedro Costa',
    price: 6.50
  },
  {
    id: '3',
    origin: 'Terminal Barra Funda',
    destination: 'CESU - Campus Sul',
    date: '2026-04-08',
    time: '18:30',
    status: 'cancelled',
    partnerName: 'Ana Oliveira',
    price: 10.00
  }
]
