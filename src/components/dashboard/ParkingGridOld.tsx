'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Car, 
  Bike, 
  MapPin, 
  Clock,
  Settings,
  RefreshCw
} from 'lucide-react'
import { 
  type EspacioConEstado 
} from '@/types/database'
import { 
  calcularDuracion, 
  formatTime,
  SISTEMA_CONFIG 
} from '@/lib/utils/calculations'
import { cn } from '@/lib/utils'

interface ParkingGridProps {
  onEspacioClick?: (espacio: EspacioConEstado) => void
  onRefresh?: () => void
  className?: string
}

export function ParkingGrid({ 
  onEspacioClick, 
  onRefresh,
  className 
}: ParkingGridProps) {
  
  // Query para obtener espacios con sus sesiones activas
  const { 
    data: espaciosConEstado, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['espacios-con-estado'],
    queryFn: async (): Promise<EspacioConEstado[]> => {
      // 1. Obtener todos los espacios
      const { data: espacios, error: espaciosError } = await supabase
        .from('espacios')
        .select('*')
        .order('numero')

      if (espaciosError) throw espaciosError

      // 2. Obtener sesiones activas
      const { data: sesionesActivas, error: sesionesError } = await supabase
        .from('sesiones_parqueo')
        .select('*')
        .eq('is_active', true)

      if (sesionesError) throw sesionesError

      // 3. Combinar espacios con sesiones activas
      const espaciosConEstado: EspacioConEstado[] = espacios.map(espacio => {
        const sesionActiva = sesionesActivas.find(
          sesion => sesion.espacio_numero === espacio.numero
        )

        return {
          ...espacio,
          sesion_activa: sesionActiva,
          ocupado_por: sesionActiva?.placa,
          tiempo_ocupado: sesionActiva ? calcularDuracion(sesionActiva.hora_entrada) : undefined
        }
      })

      return espaciosConEstado
    },
    refetchInterval: SISTEMA_CONFIG.DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: true
  })

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  const handleEspacioClick = (espacio: EspacioConEstado) => {
    onEspacioClick?.(espacio)
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            Error al cargar los espacios: {error.message}
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header con título y botón de actualizar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Espacios de Estacionamiento
          </h2>
          <Badge variant="outline" className="ml-2">
            {SISTEMA_CONFIG.TOTAL_ESPACIOS} espacios
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
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

      {/* Grid de espacios */}
      {isLoading ? (
        <div className="grid grid-cols-5 md:grid-cols-9 lg:grid-cols-15 gap-2">
          {Array.from({ length: SISTEMA_CONFIG.TOTAL_ESPACIOS }).map((_, index) => (
            <Card key={index} className="aspect-square animate-pulse">
              <CardContent className="p-2 h-full bg-gray-200 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 md:grid-cols-9 lg:grid-cols-15 gap-2">
          {espaciosConEstado?.map((espacio) => (
            <EspacioCard
              key={espacio.id}
              espacio={espacio}
              onClick={() => handleEspacioClick(espacio)}
            />
          ))}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded" />
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-100 border-2 border-orange-500 rounded" />
          <span>Mantenimiento</span>
        </div>
      </div>
    </div>
  )
}

// Componente individual para cada espacio
interface EspacioCardProps {
  espacio: EspacioConEstado
  onClick: () => void
}

function EspacioCard({ espacio, onClick }: EspacioCardProps) {
  const isOcupado = espacio.estado === 'ocupado' || !!espacio.sesion_activa
  const isDisponible = espacio.estado === 'disponible' && !espacio.sesion_activa
  const isMantenimiento = espacio.estado === 'mantenimiento'
  
  // Estilos según estado
  const cardStyles = cn(
    "aspect-square cursor-pointer transition-all duration-200 hover:scale-105",
    "border-2 relative group",
    {
      // Disponible - Verde
      "bg-green-50 border-green-500 hover:bg-green-100": isDisponible,
      
      // Ocupado - Rojo
      "bg-red-50 border-red-500 hover:bg-red-100": isOcupado,
      
      // Mantenimiento - Naranja
      "bg-orange-50 border-orange-500 hover:bg-orange-100": isMantenimiento
    }
  )

  const textStyles = cn(
    "font-bold text-sm",
    {
      "text-green-700": isDisponible,
      "text-red-700": isOcupado,
      "text-orange-700": isMantenimiento
    }
  )

  return (
    <Card className={cardStyles} onClick={onClick}>
      <CardContent className="p-1 h-full flex flex-col items-center justify-center text-center">
        {/* Número del espacio */}
        <div className={cn("text-lg font-bold mb-1", textStyles)}>
          {espacio.numero}
        </div>
        
        {/* Icono según tipo de vehículo o estado */}
        <div className="flex-1 flex items-center justify-center">
          {isOcupado && espacio.sesion_activa ? (
            espacio.sesion_activa.tipo_vehiculo === 'auto' ? (
              <Car className={cn("w-4 h-4", textStyles)} />
            ) : (
              <Bike className={cn("w-4 h-4", textStyles)} />
            )
          ) : isMantenimiento ? (
            <Settings className={cn("w-4 h-4", textStyles)} />
          ) : (
            <MapPin className={cn("w-4 h-4", textStyles)} />
          )}
        </div>

        {/* Información adicional para espacios ocupados */}
        {isOcupado && espacio.sesion_activa && (
          <div className="text-xs space-y-1 w-full">
            <div className="truncate" title={espacio.ocupado_por}>
              {espacio.ocupado_por}
            </div>
            {espacio.tiempo_ocupado && (
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{espacio.tiempo_ocupado}</span>
              </div>
            )}
          </div>
        )}

        {/* Tooltip en hover con más información */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                        opacity-0 group-hover:opacity-100 transition-opacity
                        bg-gray-900 text-white text-xs rounded-lg px-2 py-1 
                        pointer-events-none z-10 whitespace-nowrap">
          {isOcupado && espacio.sesion_activa ? (
            <div className="space-y-1">
              <div>Espacio {espacio.numero} - OCUPADO</div>
              <div>Placa: {espacio.ocupado_por}</div>
              <div>Entrada: {formatTime(espacio.sesion_activa.hora_entrada)}</div>
              <div>Tiempo: {espacio.tiempo_ocupado}</div>
            </div>
          ) : isMantenimiento ? (
            <div>Espacio {espacio.numero} - MANTENIMIENTO</div>
          ) : (
            <div>Espacio {espacio.numero} - DISPONIBLE</div>
          )}
          
          {/* Flecha del tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                          border-l-4 border-r-4 border-t-4 
                          border-l-transparent border-r-transparent border-t-gray-900">
          </div>
        </div>
      </CardContent>
    </Card>
  )
}