// Store global usando Context API
import { createContext, useContext } from 'react'
import type { User } from './mock-data'

export interface AppState {
  user: User | null
  isAuthenticated: boolean
  userType: 'passenger' | 'driver' | null
}

export interface AppContextType extends AppState {
  setUser: (user: User | null) => void
  setUserType: (type: 'passenger' | 'driver' | null) => void
  logout: () => void
}

export const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  userType: null
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
