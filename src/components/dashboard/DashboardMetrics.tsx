'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ParkingCircle, 
  Car, 
  DollarSign, 
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { 
  type MetricasDashboard 
} from '@/types/database'
import { 
  formatCurrency, 
  calculatePercentage,
  formatDateTime,
  SISTEMA_CONFIG 
} from '@/lib/utils/calculations'
import { cn } from '@/lib/utils'

interface DashboardMetricsProps {
  onRefresh?: () => void
  className?: string
}

export function DashboardMetrics({ onRefresh, className }: DashboardMetricsProps) {
  
  // Query para métricas del dashboard
  const { 
    data: metricas, 
    isLoading, 
    error,
    refetch,
    isFetching,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<MetricasDashboard> => {
      const hoy = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      
      // 1. Obtener sesiones activas
      const { data: sesionesActivas, error: sesionesError } = await supabase
        .from('sesiones_parqueo')
        .select('*')
        .eq('is_active', true)

      if (sesionesError) throw sesionesError

      // 2. Obtener ingresos del día
      const { data: sesionesDelDia, error: ingresosError } = await supabase
        .from('sesiones_parqueo')
        .select('monto_calculado')
        .gte('created_at', `${hoy}T00:00:00.000Z`)
        .lt('created_at', `${hoy}T23:59:59.999Z`)
        .eq('estado_pago', 'pagado')

      if (ingresosError) throw ingresosError

      // 3. Calcular métricas
      const espaciosOcupados = sesionesActivas.length
      const espaciosDisponibles = SISTEMA_CONFIG.TOTAL_ESPACIOS - espaciosOcupados
      const ingresosDelDia = sesionesDelDia.reduce(
        (total, sesion) => total + (sesion.monto_calculado || 0), 
        0
      )

      return {
        espacios_disponibles: espaciosDisponibles,
        espacios_ocupados: espaciosOcupados,
        ingresos_del_dia: ingresosDelDia,
        vehiculos_activos: espaciosOcupados,
        last_updated: new Date().toISOString(),
        total_espacios: SISTEMA_CONFIG.TOTAL_ESPACIOS
      }
    },
    refetchInterval: SISTEMA_CONFIG.DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: true
  })

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            Error al cargar métricas: {error.message}
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </Card>
    )
  }

  // Calcular porcentaje de ocupación
  const porcentajeOcupacion = metricas ? 
    calculatePercentage(metricas.espacios_ocupados, metricas.total_espacios) : 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header con última actualización */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h2>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            <span>
              Actualizado: {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : 'Nunca'}
            </span>
          </div>
          
          <Button 
            onClick={handleRefresh}
            variant="outline" 
            size="sm"
            disabled={isFetching}
          >
            <RefreshCw className={cn(
              "w-4 h-4 mr-2",
              isFetching && "animate-spin"
            )} />
            {isFetching ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Grid de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Espacios Disponibles */}
        <MetricCard
          title="Espacios Disponibles"
          value={metricas?.espacios_disponibles ?? 0}
          total={metricas?.total_espacios}
          icon={<ParkingCircle className="w-6 h-6" />}
          trend="positive"
          isLoading={isLoading}
          className="border-green-200 bg-green-50"
          valueClassName="text-green-700"
          iconClassName="text-green-600"
        />

        {/* Espacios Ocupados */}
        <MetricCard
          title="Espacios Ocupados"
          value={metricas?.espacios_ocupados ?? 0}
          total={metricas?.total_espacios}
          icon={<Car className="w-6 h-6" />}
          trend="neutral"
          isLoading={isLoading}
          className="border-red-200 bg-red-50"
          valueClassName="text-red-700"
          iconClassName="text-red-600"
          footer={`${porcentajeOcupacion}% de ocupación`}
        />

        {/* Ingresos del Día */}
        <MetricCard
          title="Ingresos del Día"
          value={formatCurrency(metricas?.ingresos_del_dia ?? 0)}
          icon={<DollarSign className="w-6 h-6" />}
          trend="positive"
          isLoading={isLoading}
          className="border-blue-200 bg-blue-50"
          valueClassName="text-blue-700"
          iconClassName="text-blue-600"
        />

        {/* Vehículos Activos */}
        <MetricCard
          title="Vehículos Activos"
          value={metricas?.vehiculos_activos ?? 0}
          icon={<Activity className="w-6 h-6" />}
          trend="neutral"
          isLoading={isLoading}
          className="border-purple-200 bg-purple-50"
          valueClassName="text-purple-700"
          iconClassName="text-purple-600"
        />
      </div>
    </div>
  )
}

// Componente individual para cada métrica
interface MetricCardProps {
  title: string
  value: string | number
  total?: number
  icon: React.ReactNode
  trend?: 'positive' | 'negative' | 'neutral'
  footer?: string
  isLoading?: boolean
  className?: string
  valueClassName?: string
  iconClassName?: string
}

function MetricCard({
  title,
  value,
  total,
  icon,
  trend = 'neutral',
  footer,
  isLoading = false,
  className = "",
  valueClassName = "",
  iconClassName = ""
}: MetricCardProps) {
  
  const trendIcon = {
    positive: <TrendingUp className="w-4 h-4 text-green-600" />,
    negative: <TrendingDown className="w-4 h-4 text-red-600" />,
    neutral: null
  }

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={cn("opacity-80", iconClassName)}>
          {icon}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {/* Valor principal */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "text-2xl font-bold",
              valueClassName,
              isLoading && "animate-pulse bg-gray-200 rounded h-8 w-16"
            )}>
              {isLoading ? '' : value}
              {total && !isLoading && (
                <span className="text-lg text-gray-500 ml-1">/ {total}</span>
              )}
            </div>
            {trendIcon[trend]}
          </div>
          
          {/* Footer con información adicional */}
          {footer && !isLoading && (
            <p className="text-xs text-gray-500">
              {footer}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}