'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSessionTimeout } from '@/lib/hooks/useSessionTimeout'
import { SessionWarning, useSessionWarning } from '@/components/auth/SessionWarning'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const sessionWarning = useSessionWarning()
  
  // Configurar timeout de sesión con callbacks
  const sessionTimeout = useSessionTimeout({
    onWarning: (timeRemaining) => {
      sessionWarning.showWarning(timeRemaining)
    },
    onLogout: (reason) => {
      console.log(`Session ended: ${reason}`)
      sessionWarning.hideWarning()
    },
    onRefresh: () => {
      console.log('Session refreshed automatically')
    }
  })

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 ml-64">
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Session Warning Modal */}
      <SessionWarning
        isVisible={sessionWarning.isVisible}
        timeRemaining={sessionWarning.timeRemaining}
        onExtendSession={sessionWarning.extendSession}
        onLogout={() => sessionTimeout.performLogout('manual')}
      />
    </div>
  )
}