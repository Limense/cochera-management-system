'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Car, 
  ParkingCircle, 
  DollarSign, 
  Activity,
  Users,
  Clock
} from 'lucide-react'

// Mock data - esto se reemplazará con datos reales de Supabase
const mockMetrics = {
  totalSpaces: 50,
  occupiedSpaces: 32,
  availableSpaces: 18,
  dailyRevenue: 450,
  activeVehicles: 32,
  todayEntries: 45
}

export default function DashboardPage() {
  const occupancyRate = Math.round((mockMetrics.occupiedSpaces / mockMetrics.totalSpaces) * 100)
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Panel principal de control del sistema</p>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Espacios Totales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacios Totales</CardTitle>
            <ParkingCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Capacidad total del estacionamiento
            </p>
          </CardContent>
        </Card>
        
        {/* Espacios Ocupados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacios Ocupados</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockMetrics.occupiedSpaces}</div>
            <div className="flex items-center space-x-2">
              <Badge variant={occupancyRate > 80 ? "destructive" : "secondary"}>
                {occupancyRate}% ocupación
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* Espacios Disponibles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacios Disponibles</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockMetrics.availableSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Listos para nuevos vehículos
            </p>
          </CardContent>
        </Card>
        
        {/* Ingresos del Día */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/{mockMetrics.dailyRevenue}</div>
            <p className="text-xs text-muted-foreground">
              +12% vs ayer
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Vehículos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{mockMetrics.activeVehicles}</div>
            <p className="text-sm text-gray-600">Vehículos actualmente estacionados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Entradas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{mockMetrics.todayEntries}</div>
            <p className="text-sm text-gray-600">Total de ingresos registrados</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ✅ Sistema Operativo
            </Badge>
            <Badge variant="outline">
              Base de Datos Conectada
            </Badge>
            <Badge variant="outline">
              {mockMetrics.totalSpaces} Espacios Monitoreados
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}