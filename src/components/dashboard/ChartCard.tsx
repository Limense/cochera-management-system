'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  isLoading?: boolean
  onRefresh?: () => void
  actions?: React.ReactNode
}

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  isLoading = false,
  onRefresh,
  actions
}: ChartCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                isLoading && "animate-spin"
              )} />
            </Button>
          )}
          {actions}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
              <p className="text-sm text-muted-foreground">Cargando gráfico...</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente específico para gráficos de línea/área de ingresos
export function IngresosChartCard({
  title = "Evolución de Ingresos",
  children,
  periodo = "7 días",
  isLoading,
  onRefresh,
  className
}: {
  title?: string
  children: React.ReactNode
  periodo?: string
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}) {
  return (
    <ChartCard
      title={title}
      subtitle={`Últimos ${periodo}`}
      isLoading={isLoading}
      onRefresh={onRefresh}
      className={className}
    >
      {children}
    </ChartCard>
  )
}

// Componente específico para gráficos de barras de vehículos
export function VehiculosChartCard({
  title = "Distribución de Vehículos",
  children,
  isLoading,
  onRefresh,
  className
}: {
  title?: string
  children: React.ReactNode
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}) {
  return (
    <ChartCard
      title={title}
      subtitle="Por tipo de vehículo"
      isLoading={isLoading}
      onRefresh={onRefresh}
      className={className}
    >
      {children}
    </ChartCard>
  )
}

// Componente específico para gráficos de pie/dona de ocupación
export function OcupacionChartCard({
  title = "Estado de Ocupación",
  children,
  isLoading,
  onRefresh,
  className
}: {
  title?: string
  children: React.ReactNode
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}) {
  return (
    <ChartCard
      title={title}
      subtitle="Distribución actual"
      isLoading={isLoading}
      onRefresh={onRefresh}
      className={className}
    >
      {children}
    </ChartCard>
  )
}