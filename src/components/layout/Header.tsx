'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

export function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const currentTime = new Date().toLocaleString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Breadcrumb and time */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">{currentTime}</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Sistema Activo
          </Badge>
          
          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          
          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <User className="h-5 w-5" />
            </Button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-2">
                  {/* User Info */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500">{profile?.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {profile?.role === 'admin' ? 'Administrador' : 'Supervisor'}
                    </Badge>
                  </div>
                  
                  {/* Menu Items */}
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración
                  </button>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}