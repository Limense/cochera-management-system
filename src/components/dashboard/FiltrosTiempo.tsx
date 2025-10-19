'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PeriodoFiltro = 'hoy' | 'semana' | 'mes'

interface FiltrosTiempoProps {
  periodoActivo: PeriodoFiltro
  onPeriodoChange: (periodo: PeriodoFiltro) => void
  isLoading?: boolean
  className?: string
}

const periodos: Array<{
  key: PeriodoFiltro
  label: string
  descripcion: string
  icon: React.ReactNode
}> = [
  {
    key: 'hoy',
    label: 'Hoy',
    descripcion: 'Datos del día actual',
    icon: <Clock className="w-4 h-4" />
  },
  {
    key: 'semana',
    label: 'Semana',
    descripcion: 'Últimos 7 días',
    icon: <Calendar className="w-4 h-4" />
  },
  {
    key: 'mes',
    label: 'Mes',
    descripcion: 'Últimos 30 días',
    icon: <TrendingUp className="w-4 h-4" />
  }
]

export function FiltrosTiempo({
  periodoActivo,
  onPeriodoChange,
  isLoading = false,
  className
}: FiltrosTiempoProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Período de análisis</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona el rango de tiempo para las métricas
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {periodos.map((periodo) => {
              const isActivo = periodo.key === periodoActivo
              
              return (
                <Button
                  key={periodo.key}
                  variant={isActivo ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPeriodoChange(periodo.key)}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center space-x-2 transition-all duration-200",
                    isActivo && "shadow-md"
                  )}
                >
                  {periodo.icon}
                  <span>{periodo.label}</span>
                  {isActivo && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Activo
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Descripción del período activo */}
        <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-xs text-blue-800">
            📊 <strong>Período activo:</strong>{' '}
            {periodos.find(p => p.key === periodoActivo)?.descripcion}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente más compacto para usar en headers
export function FiltrosTiempoCompacto({
  periodoActivo,
  onPeriodoChange,
  isLoading = false,
  className
}: FiltrosTiempoProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {periodos.map((periodo) => {
        const isActivo = periodo.key === periodoActivo
        
        return (
          <Button
            key={periodo.key}
            variant={isActivo ? "default" : "ghost"}
            size="sm"
            onClick={() => onPeriodoChange(periodo.key)}
            disabled={isLoading}
            className={cn(
              "flex items-center space-x-1",
              isActivo && "shadow-sm"
            )}
          >
            {periodo.icon}
            <span className="hidden sm:inline">{periodo.label}</span>
          </Button>
        )
      })}
    </div>
  )
}