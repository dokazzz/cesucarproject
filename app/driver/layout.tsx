'use client'

import { Navbar } from '@/components/navbar'

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar userType="driver" />
      <div className="pb-20 pt-14 md:pb-4 md:pt-20">
        {children}
      </div>
    </div>
  )
}
