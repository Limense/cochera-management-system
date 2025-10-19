'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  IngresosCard, 
  VehiculosCard, 
  OcupacionCard 
} from '@/components/dashboard/StatsCard'
import { 
  IngresosChartCard,
  VehiculosChartCard,
  OcupacionChartCard
} from '@/components/dashboard/ChartCard'
import { 
  FiltrosTiempoCompacto,
  type PeriodoFiltro
} from '@/components/dashboard/FiltrosTiempo'
import {
  IngresosAreaChart,
  VehiculosBarChart,
  DistribucionPieChart,
  TendenciasLineChart
} from '@/components/dashboard/GraficosModernos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  TrendingUp, 
  ParkingCircle,
  BarChart3
} from 'lucide-react'

interface EstadisticasDashboard {
  metricas: {
    totalIngresos: number
    totalVehiculos: number
    vehiculosActivos: number
    espaciosDisponibles: number
    autosDelPeriodo: number
    motosDelPeriodo: number
    tendenciaIngresos: number
    tendenciaVehiculos: number
  }
  graficos: {
    ingresosPorDia: Array<{
      fecha: string
      ingresos: number
      vehiculos: number
      autos: number
      motos: number
    }>
    distribucionVehiculos: Array<{
      tipo: string
      cantidad: number
      porcentaje: number
      color: string
    }>
  }
  periodo: PeriodoFiltro
  fechaInicio: string
  fechaFin: string
  lastUpdated: string
}

export default function DashboardProfesional() {
  const { profile } = useAuth()
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoFiltro>('hoy')

  // Query para estadísticas avanzadas
  const { 
    data: estadisticas, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['dashboard-stats', periodoActivo, profile?.id],
    queryFn: async (): Promise<EstadisticasDashboard> => {
      const params = new URLSearchParams({
        periodo: periodoActivo,
        adminId: profile?.id || ''
      })
      
      const response = await fetch(`/api/dashboard-stats?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar estadísticas')
      }
      
      return response.json()
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // Refrescar cada 30 segundos
    refetchIntervalInBackground: true
  })

  const handleRefresh = () => {
    refetch()
  }

  const getResumenPeriodo = () => {
    switch (periodoActivo) {
      case 'semana':
        return 'últimos 7 días'
      case 'mes':
        return 'últimos 30 días'
      default:
        return 'hoy'
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Profesional</h1>
            <p className="text-gray-600">Panel avanzado de control y análisis</p>
          </div>
        </div>
        
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-600 font-medium">
              Error al cargar el dashboard: {(error as Error).message}
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Profesional</h1>
          <p className="text-gray-600">
            Análisis avanzado de métricas para {getResumenPeriodo()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <FiltrosTiempoCompacto
            periodoActivo={periodoActivo}
            onPeriodoChange={setPeriodoActivo}
            isLoading={isLoading || isFetching}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Información del período y última actualización */}
      {estadisticas && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Período: {estadisticas.periodo}</span>
                </Badge>
                <span className="text-sm text-gray-500">
                  {estadisticas.fechaInicio} - {estadisticas.fechaFin}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Última actualización: {new Date(estadisticas.lastUpdated).toLocaleString('es-PE')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <IngresosCard
          value={estadisticas?.metricas.totalIngresos || 0}
          trend={{
            value: estadisticas?.metricas.tendenciaIngresos || 0,
            isPositive: (estadisticas?.metricas.tendenciaIngresos || 0) >= 0
          }}
          isLoading={isLoading}
          periodo={periodoActivo}
        />
        
        <VehiculosCard
          value={estadisticas?.metricas.totalVehiculos || 0}
          trend={{
            value: estadisticas?.metricas.tendenciaVehiculos || 0,
            isPositive: (estadisticas?.metricas.tendenciaVehiculos || 0) >= 0
          }}
          subtitle={`${estadisticas?.metricas.autosDelPeriodo || 0} autos, ${estadisticas?.metricas.motosDelPeriodo || 0} motos`}
          isLoading={isLoading}
        />
        
        <OcupacionCard
          ocupados={estadisticas?.metricas.vehiculosActivos || 0}
          total={50} // Total de espacios
          isLoading={isLoading}
        />

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Espacios Disponibles</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {estadisticas?.metricas.espaciosDisponibles || 0}
                </p>
                <p className="text-xs text-gray-500">Listos para ocupar</p>
              </div>
              
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <ParkingCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IngresosChartCard
          title="Evolución de Ingresos"
          periodo={getResumenPeriodo()}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        >
          {estadisticas?.graficos.ingresosPorDia && (
            <IngresosAreaChart data={estadisticas.graficos.ingresosPorDia} />
          )}
        </IngresosChartCard>

        <VehiculosChartCard
          title="Vehículos por Día"
          isLoading={isLoading}
          onRefresh={handleRefresh}
        >
          {estadisticas?.graficos.ingresosPorDia && (
            <VehiculosBarChart data={estadisticas.graficos.ingresosPorDia} />
          )}
        </VehiculosChartCard>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OcupacionChartCard
          title="Distribución de Vehículos"
          isLoading={isLoading}
          onRefresh={handleRefresh}
        >
          {estadisticas?.graficos.distribucionVehiculos && (
            <DistribucionPieChart data={estadisticas.graficos.distribucionVehiculos} />
          )}
        </OcupacionChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Tendencias Combinadas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              </div>
            ) : estadisticas?.graficos.ingresosPorDia ? (
              <TendenciasLineChart data={estadisticas.graficos.ingresosPorDia} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}