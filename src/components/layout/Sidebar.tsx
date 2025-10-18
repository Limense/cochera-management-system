'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Car, 
  LogIn, 
  LogOut, 
  Users, 
  BarChart3, 
  Settings,
  ParkingCircle
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Entrada', href: '/dashboard/entrada', icon: LogIn },
  { name: 'Salida', href: '/dashboard/salida', icon: LogOut },
  { name: 'Espacios', href: '/dashboard/espacios', icon: ParkingCircle },
  { name: 'Vehículos', href: '/dashboard/vehiculos', icon: Car },
  { name: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { name: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-gray-900">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <h1 className="text-white text-xl font-bold">Sistema Cochera</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon
                className="mr-3 h-5 w-5 flex-shrink-0"
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="flex-shrink-0 px-2 py-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}