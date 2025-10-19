'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Plus,
  LogOut,
  Car, 
  Bike,
  ParkingCircle 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  type Espacio, 
  type SesionParqueo 
} from '@/types/database'
import { 
  SISTEMA_CONFIG,
  formatDateTime
} from '@/lib/utils/calculations'
import { EntradaModal } from './EntradaModal'
import { SalidaModal } from './SalidaModal'

interface EspacioConSesion extends Espacio {
  sesion_activa?: SesionParqueo
}

interface ParkingGridProps {
  className?: string
}

export function ParkingGrid({ className }: ParkingGridProps) {
  const [entradaModalOpen, setEntradaModalOpen] = useState(false)
  const [salidaModalOpen, setSalidaModalOpen] = useState(false)
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<number | undefined>()

  // Query para obtener espacios con sesiones activas
  const { 
    data: espacios = [], 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['espacios'],
    queryFn: async (): Promise<EspacioConSesion[]> => {
      // 1. Obtener todos los espacios
      const { data: espaciosData, error: espaciosError } = await supabase
        .from('espacios')
        .select('*')
        .order('numero')

      if (espaciosError) throw espaciosError

      // 2. Obtener sesiones activas (simplificado - no necesita join con vehículos)
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones_parqueo')
        .select('*')
        .eq('is_active', true)

      if (sesionesError) throw sesionesError

      // 3. Combinar datos - usando espacio_numero como clave
      return espaciosData.map(espacio => {
        const sesionActiva = sesionesData.find(s => s.espacio_numero === espacio.numero)
        return {
          ...espacio,
          sesion_activa: sesionActiva || undefined
        }
      })
    },
    refetchInterval: SISTEMA_CONFIG.DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: true
  })

  const handleEspacioClick = (espacio: EspacioConSesion) => {
    if (espacio.estado === 'disponible') {
      setEspacioSeleccionado(espacio.numero)
      setEntradaModalOpen(true)
    }
  }

  const handleNuevaEntrada = () => {
    setEspacioSeleccionado(undefined)
    setEntradaModalOpen(true)
  }

  const handleProcesarSalida = () => {
    setSalidaModalOpen(true)
  }

  // Calcular estadísticas
  const espaciosDisponibles = espacios.filter(e => e.estado === 'disponible').length
  const espaciosOcupados = espacios.filter(e => e.estado === 'ocupado').length

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            Error al cargar espacios: {error.message}
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Estado de Espacios</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {espaciosDisponibles} Disponibles
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              {espaciosOcupados} Ocupados
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleNuevaEntrada}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrada
          </Button>
          
          <Button 
            onClick={handleProcesarSalida}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Procesar Salida
          </Button>
          
          <Button 
            onClick={() => refetch()}
            variant="outline" 
            size="sm"
            disabled={isFetching}
          >
            <RefreshCw className={cn(
              "w-4 h-4",
              isFetching && "animate-spin"
            )} />
          </Button>
        </div>
      </div>

      {/* Grid de espacios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Distribución de {SISTEMA_CONFIG.TOTAL_ESPACIOS} espacios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-9 gap-2">
              {Array.from({ length: SISTEMA_CONFIG.TOTAL_ESPACIOS }, (_, i) => (
                <div 
                  key={i}
                  className="aspect-square bg-gray-200 border rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-9 gap-2">
              {espacios.map((espacio) => {
                const isOcupado = espacio.estado === 'ocupado'
                const isMantenimiento = espacio.estado === 'mantenimiento'
                const sesion = espacio.sesion_activa
                
                return (
                  <div
                    key={espacio.id}
                    className={cn(
                      "aspect-square border-2 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 cursor-pointer",
                      {
                        // Disponible
                        "bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:shadow-md": !isOcupado && !isMantenimiento,
                        // Ocupado
                        "bg-red-100 border-red-300 text-red-700 hover:bg-red-200": isOcupado,
                        // Mantenimiento
                        "bg-yellow-100 border-yellow-300 text-yellow-700": isMantenimiento
                      }
                    )}
                    onClick={() => handleEspacioClick(espacio)}
                    title={
                      isOcupado && sesion 
                        ? `Espacio ${espacio.numero} - Ocupado\nVehículo: ${sesion.placa}\nTipo: ${sesion.tipo_vehiculo}\nDesde: ${formatDateTime(sesion.hora_entrada)}`
                        : isMantenimiento
                        ? `Espacio ${espacio.numero} - En mantenimiento`
                        : `Espacio ${espacio.numero} - Disponible (Click para asignar)`
                    }
                  >
                    {/* Número del espacio */}
                    <span className="font-bold">{espacio.numero}</span>
                    
                    {/* Información adicional para espacios ocupados */}
                    {isOcupado && sesion && (
                      <div className="flex items-center justify-center mt-1">
                        {sesion.tipo_vehiculo === 'auto' ? (
                          <Car className="w-3 h-3" />
                        ) : (
                          <Bike className="w-3 h-3" />
                        )}
                      </div>
                    )}
                    
                    {/* Icono para mantenimiento */}
                    {isMantenimiento && (
                      <div className="flex items-center justify-center mt-1">
                        <ParkingCircle className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Leyenda */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-gray-600">Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
              <span className="text-gray-600">Mantenimiento</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para nueva entrada */}
      <EntradaModal
        isOpen={entradaModalOpen}
        onClose={() => {
          setEntradaModalOpen(false)
          setEspacioSeleccionado(undefined)
        }}
        espaciosDisponibles={espacios}
        espacioSeleccionado={espacioSeleccionado}
      />

      {/* Modal para procesar salida */}
      <SalidaModal
        isOpen={salidaModalOpen}
        onClose={() => setSalidaModalOpen(false)}
      />
    </div>
  )
}