'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  LayoutDashboard, 
  Car, 
  LogIn, 
  LogOut, 
  Users, 
  BarChart3, 
  Settings,
  ParkingCircle,
  Wallet,
  DollarSign,
  Shield,
  Bell,
  Database
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Panel principal con estadísticas y gráficos' },
  { name: 'Control de Caja', href: '/control-caja', icon: Wallet, description: 'Gestión de arqueos, ingresos y egresos' },
  { name: 'Entrada', href: '/entrada', icon: LogIn, description: 'Registro de ingreso de vehículos' },
  { name: 'Salida', href: '/salida', icon: LogOut, description: 'Procesamiento de salidas y cobros' },
  { name: 'Espacios', href: '/espacios', icon: ParkingCircle, description: 'Gestión visual de espacios de parqueo' },
  { name: 'Vehículos', href: '/vehiculos', icon: Car, description: 'Administración de vehículos registrados' },
  { name: 'Tarifas', href: '/tarifas', icon: DollarSign, description: 'Configuración de tarifas dinámicas' },
  { name: 'Reportes', href: '/reportes', icon: BarChart3, description: 'Informes y estadísticas detalladas' },
  { name: 'Usuarios', href: '/usuarios', icon: Users, description: 'Gestión de usuarios del sistema' },
  { name: 'Notificaciones', href: '/notificaciones', icon: Bell, description: 'Centro de notificaciones y alertas' },
  { name: 'Diagnóstico', href: '/diagnostico', icon: Database, description: 'Verificación de conexión a Supabase' },
  { name: 'Respaldos', href: '/backup', icon: Shield, description: 'Sistema de respaldos automáticos' },
  { name: 'Configuración', href: '/configuracion', icon: Settings, description: 'Configuración general del sistema' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-gray-900">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <h1 className="text-white text-xl font-bold">Sistema Cochera</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-4">
        {/* Sección Principal */}
        <div className="space-y-1">
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Principal</h3>
          </div>
          {navigation
            .filter(item => ['Dashboard', 'Control de Caja'].includes(item.name))
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                  title={item.description}
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              )
            })}
        </div>

        {/* Sección Operaciones */}
        <div className="space-y-1">
          <div className="px-2 py-1 mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operaciones</h3>
          </div>
          {navigation
            .filter(item => ['Entrada', 'Salida', 'Espacios'].includes(item.name))
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                  title={item.description}
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              )
            })}
        </div>

        {/* Sección Administración */}
        <div className="space-y-1">
          <div className="px-2 py-1 mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administración</h3>
          </div>
          {navigation
            .filter(item => ['Vehículos', 'Reportes', 'Usuarios', 'Configuración'].includes(item.name))
            .filter(item => {
              // Filtrar por roles - solo admin puede ver Usuarios y Configuración
              if (item.name === 'Usuarios' || item.name === 'Configuración') {
                return isAdmin
              }
              return true
            })
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                  title={item.description}
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              )
            })}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-4 border-t border-gray-700">
        <div className="bg-gray-800 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {profile?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {profile?.role || 'Operador'}
              </p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          onClick={async () => {
            await signOut()
            window.location.href = '/login'
          }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}