// Funções de API integradas com o backend Python (FastAPI)
// O backend Python fornece matching inteligente de rotas

import { mockRides, mockUsers, mockMessages, mockHistory } from './mock-data'
import type { Ride, User, Message, RideHistory } from './mock-data'

// Simula delay de rede
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Base URL do backend Python
const PYTHON_API_BASE = '/api/python'

// ===== TIPOS PARA O BACKEND PYTHON =====

interface MatchResult {
  ride: {
    id: string
    driver_id: string
    driver_name: string
    driver_rating: number
    origin: { name: string; lat: number; lng: number }
    destination: { name: string; lat: number; lng: number }
    date: string
    time: string
    available_seats: number
    total_seats: number
    price: number
    preferences: { music: boolean; smoking: boolean; pets: boolean }
  }
  match_score: number
  origin_distance_km: number
  destination_distance_km: number
  preference_match: number
  time_compatibility: number
}

interface MatchResponse {
  matches: MatchResult[]
}

// ===== FUNÇÕES DO BACKEND PYTHON =====

/**
 * Busca caronas usando o algoritmo de matching inteligente do Python
 */
export async function getSmartMatches(params: {
  origin: string
  destination: string
  date?: string
  time?: string
  maxDistance?: number
  preferences?: { music: boolean; smoking: boolean; pets: boolean }
}): Promise<{ matches: MatchResult[]; error?: string }> {
  try {
    const queryParams = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      ...(params.date && { date: params.date }),
      ...(params.time && { time: params.time }),
      max_distance: String(params.maxDistance || 2.0)
    })

    const response = await fetch(`${PYTHON_API_BASE}/match/simple?${queryParams}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Erro ao buscar caronas')
    }

    const data: MatchResponse = await response.json()
    return { matches: data.matches }
  } catch (error) {
    console.error('Erro no matching inteligente:', error)
    // Fallback para dados mockados se o Python não estiver disponível
    return { matches: [], error: 'Serviço de matching indisponível' }
  }
}

/**
 * Obtém localizações conhecidas do backend Python
 */
export async function getKnownLocations(): Promise<{ name: string; lat: number; lng: number }[]> {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/locations`)
    if (!response.ok) throw new Error('Erro ao buscar localizações')
    const data = await response.json()
    return data.locations
  } catch (error) {
    console.error('Erro ao buscar localizações:', error)
    return []
  }
}

/**
 * Obtém recomendações baseadas no histórico do usuário
 */
export async function getRecommendations(userId: string, history: RideHistory[]): Promise<{
  recommended_routes: { destination: string; frequency: number; suggested_time: string }[]
  frequent_destinations: string[]
  best_times: string[]
}> {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        history: history.map(h => ({
          destination: h.destination,
          time: h.time,
          date: h.date
        }))
      })
    })

    if (!response.ok) throw new Error('Erro ao buscar recomendações')
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar recomendações:', error)
    return { recommended_routes: [], frequent_destinations: [], best_times: [] }
  }
}

/**
 * Obtém estatísticas analíticas do sistema
 */
export async function getAnalytics(): Promise<{
  total_rides: number
  total_available_seats: number
  average_price: number
  average_driver_rating: number
  rides_by_destination: Record<string, number>
}> {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/analytics/summary`)
    if (!response.ok) throw new Error('Erro ao buscar analytics')
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar analytics:', error)
    return {
      total_rides: 0,
      total_available_seats: 0,
      average_price: 0,
      average_driver_rating: 0,
      rides_by_destination: {}
    }
  }
}

/**
 * Verifica se o backend Python está disponível
 */
export async function checkPythonHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PYTHON_API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}

// Autenticação
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  await delay(500)
  
  const user = mockUsers.find(u => u.email === email)
  if (user && password.length >= 6) {
    return { success: true, user }
  }
  return { success: false, error: 'Email ou senha inválidos' }
}

export async function register(data: {
  name: string
  email: string
  phone: string
  password: string
}): Promise<{ success: boolean; user?: User; error?: string }> {
  await delay(500)
  
  if (mockUsers.some(u => u.email === data.email)) {
    return { success: false, error: 'Email já cadastrado' }
  }
  
  const newUser: User = {
    id: String(mockUsers.length + 1),
    name: data.name,
    email: data.email,
    phone: data.phone,
    rating: 5.0,
    totalRides: 0,
    type: 'passenger'
  }
  
  return { success: true, user: newUser }
}

// Caronas
export async function getRides(filters?: {
  origin?: string
  destination?: string
  date?: string
  time?: string
}): Promise<Ride[]> {
  await delay(300)
  
  let rides = [...mockRides]
  
  if (filters?.origin) {
    rides = rides.filter(r => r.origin.toLowerCase().includes(filters.origin!.toLowerCase()))
  }
  if (filters?.destination) {
    rides = rides.filter(r => r.destination.toLowerCase().includes(filters.destination!.toLowerCase()))
  }
  if (filters?.date) {
    rides = rides.filter(r => r.date === filters.date)
  }
  
  return rides
}

export async function getRideById(id: string): Promise<Ride | null> {
  await delay(200)
  return mockRides.find(r => r.id === id) || null
}

export async function createRide(data: Partial<Ride>): Promise<{ success: boolean; ride?: Ride; error?: string }> {
  await delay(500)
  
  const newRide: Ride = {
    id: String(mockRides.length + 1),
    driverId: '1',
    driverName: 'Você',
    driverRating: 5.0,
    origin: data.origin || '',
    destination: data.destination || '',
    date: data.date || '',
    time: data.time || '',
    availableSeats: data.totalSeats || 4,
    totalSeats: data.totalSeats || 4,
    price: data.price || 0,
    preferences: data.preferences || { music: false, smoking: false, pets: false },
    vehicle: data.vehicle || { model: '', color: '', plate: '' },
    passengers: []
  }
  
  return { success: true, ride: newRide }
}

export async function requestRide(rideId: string, passengerId: string): Promise<{ success: boolean; error?: string }> {
  await delay(500)
  
  const ride = mockRides.find(r => r.id === rideId)
  if (!ride) {
    return { success: false, error: 'Carona não encontrada' }
  }
  if (ride.availableSeats <= 0) {
    return { success: false, error: 'Não há vagas disponíveis' }
  }
  
  return { success: true }
}

// Mensagens
export async function getMessages(chatId: string): Promise<Message[]> {
  await delay(200)
  return mockMessages
}

export async function sendMessage(chatId: string, content: string): Promise<{ success: boolean; message?: Message }> {
  await delay(200)
  
  const newMessage: Message = {
    id: String(mockMessages.length + 1),
    senderId: '2',
    content,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    isOwn: true
  }
  
  return { success: true, message: newMessage }
}

// Histórico
export async function getRideHistory(): Promise<RideHistory[]> {
  await delay(300)
  return mockHistory
}

// Avaliação
export async function submitRating(rideId: string, rating: number, comment?: string): Promise<{ success: boolean }> {
  await delay(300)
  return { success: true }
}

// Upload de documentos (simulado)
export async function uploadDocument(type: 'selfie' | 'document' | 'cnh' | 'crlv', file: File): Promise<{ success: boolean; url?: string }> {
  await delay(1000)
  return { success: true, url: URL.createObjectURL(file) }
}
