'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSupervisor?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSupervisor = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, isActive } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Esperar a que termine de cargar
    if (loading) return

    // Si no hay usuario, redireccionar a login
    if (!user) {
      router.push('/login')
      return
    }

    // Si el usuario no está activo
    if (!isActive) {
      router.push('/login')
      return
    }

    // Verificar permisos específicos
    if (requireAdmin && profile?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    if (requireSupervisor && !['admin', 'supervisor'].includes(profile?.role || '')) {
      router.push('/dashboard')
      return
    }
  }, [user, profile, loading, isActive, router, requireAdmin, requireSupervisor])

  // Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Si no hay usuario o no está activo, no mostrar contenido
  if (!user || !isActive) {
    return null
  }

  // Verificar permisos antes de mostrar contenido
  if (requireAdmin && profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  if (requireSupervisor && !['admin', 'supervisor'].includes(profile?.role || '')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Necesitas permisos de supervisor o administrador.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}