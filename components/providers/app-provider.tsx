'use client'

import { useState, ReactNode } from 'react'
import { AppContext, initialState } from '@/lib/store'
import type { User } from '@/lib/mock-data'

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [user, setUser] = useState<User | null>(initialState.user)
  const [userType, setUserType] = useState<'passenger' | 'driver' | null>(initialState.userType)

  const logout = () => {
    setUser(null)
    setUserType(null)
  }

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        userType,
        setUser,
        setUserType,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
