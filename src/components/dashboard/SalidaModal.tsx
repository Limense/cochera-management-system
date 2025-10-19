'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Car, 
  Bike, 
  Clock, 
  DollarSign,
  LogOut,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react'
import { toast } from 'sonner'

import { 
  type SesionParqueo
} from '@/types/database'
import { 
  calcularTarifa,
  calcularTarifaDinamicaCompleta,
  formatDateTime,
  formatCurrency,
  calcularDuracion
} from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'

// Schema de validación para salida
const salidaSchema = z.object({
  busqueda_placa: z
    .string()
    .min(6, 'Ingrese al menos 6 caracteres')
    .max(10, 'Máximo 10 caracteres'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'yape', 'plin']),
  monto_recibido: z
    .number()
    .min(0, 'El monto debe ser mayor a 0')
    .optional()
})

type SalidaFormData = z.infer<typeof salidaSchema>

// Tipo simplificado - ya no necesitamos join con vehiculos

interface SalidaModalProps {
  isOpen: boolean
  onClose: () => void
  placaBusqueda?: string
}

export function SalidaModal({ 
  isOpen, 
  onClose, 
  placaBusqueda 
}: SalidaModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionParqueo | null>(null)
  const [showConfirmacion, setShowConfirmacion] = useState(false)
  const [calculandoTarifa, setCalculandoTarifa] = useState(false)
  const [montoCalculado, setMontoCalculado] = useState<number>(0)
  
  const form = useForm<SalidaFormData>({
    resolver: zodResolver(salidaSchema),
    defaultValues: {
      busqueda_placa: placaBusqueda || '',
      metodo_pago: 'efectivo',
      monto_recibido: undefined
    }
  })

  const placaBusquedaValue = form.watch('busqueda_placa')

  // Función para calcular monto con cache en tiempo real
  const [montosCalculados, setMontosCalculados] = useState<Record<string, number>>({})
  
  const calcularMontoSesion = async (sesion: SesionParqueo) => {
    if (montosCalculados[sesion.id]) {
      return montosCalculados[sesion.id]
    }
    
    try {
      const monto = await calcularTarifaDinamicaCompleta(
        sesion.tipo_vehiculo,
        new Date(sesion.hora_entrada)
      )
      setMontosCalculados(prev => ({ ...prev, [sesion.id]: monto }))
      return monto
    } catch {
      const monto = calcularTarifa(sesion.tipo_vehiculo, new Date(sesion.hora_entrada))
      setMontosCalculados(prev => ({ ...prev, [sesion.id]: monto }))
      return monto
    }
  }

  // Componente para mostrar monto calculado
  const MontoSesion = ({ sesion }: { sesion: SesionParqueo }) => {
    const [monto, setMonto] = useState<number | null>(montosCalculados[sesion.id] || null)
    const [loading, setLoading] = useState(!montosCalculados[sesion.id])

    useEffect(() => {
      if (!montosCalculados[sesion.id]) {
        calcularMontoSesion(sesion).then(montoCalculado => {
          setMonto(montoCalculado)
          setLoading(false)
        })
      } else {
        setMonto(montosCalculados[sesion.id])
        setLoading(false)
      }
    }, [sesion])

    if (loading) {
      return (
        <div className="flex items-center gap-1 font-bold text-lg">
          <DollarSign className="w-4 h-4" />
          <span className="text-gray-400">...</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1 font-bold text-lg">
        <DollarSign className="w-4 h-4" />
        {formatCurrency(monto || 0)}
      </div>
    )
  }

  // Query para buscar sesiones activas
  const { 
    data: sesionesActivas = [], 
    isLoading: loadingSesiones 
  } = useQuery({
    queryKey: ['sesiones-activas', placaBusquedaValue],
    queryFn: async (): Promise<SesionParqueo[]> => {
      let query = supabase
        .from('sesiones_parqueo')
        .select('*')
        .eq('is_active', true)
        .order('hora_entrada', { ascending: false })

      // Si hay búsqueda, filtrar por placa
      if (placaBusquedaValue.length >= 3) {
        query = query.ilike('placa', `%${placaBusquedaValue.toUpperCase()}%`)
      }

      const { data, error } = await query.limit(10)
      if (error) throw error
      return data || []
    },
    enabled: isOpen
  })

  // Mutación para procesar salida
  const procesarSalidaMutation = useMutation({
    mutationFn: async (data: {
      sesion: SesionParqueo
      metodo_pago: string
      monto_recibido?: number
    }): Promise<{ montoCalculado: number }> => {
      if (!user?.id) throw new Error('Usuario no autenticado')

      const horaSalida = new Date()
      
      // Usar pricing dinámico para calcular el monto
      const montoCalculado = await calcularTarifaDinamicaCompleta(
        data.sesion.tipo_vehiculo,
        new Date(data.sesion.hora_entrada),
        horaSalida
      )

      // 1. Actualizar sesión de parqueo
      const { error: sesionError } = await supabase
        .from('sesiones_parqueo')
        .update({
          hora_salida: horaSalida.toISOString(),
          monto_calculado: montoCalculado,
          estado_pago: 'pagado',
          metodo_pago: data.metodo_pago,
          processed_by: user.id
        })
        .eq('id', data.sesion.id)

      if (sesionError) throw sesionError

      // 2. Liberar espacio
      const { error: espacioError } = await supabase
        .from('espacios')
        .update({ estado: 'disponible' })
        .eq('numero', data.sesion.espacio_numero)

      if (espacioError) throw espacioError

      // 3. Actualizar registro del vehículo (simplificado)
      const { error: vehiculoError } = await supabase
        .from('vehiculos')
        .update({
          last_visit: horaSalida.toISOString()
        })
        .eq('placa', data.sesion.placa)

      if (vehiculoError) console.warn('Error actualizando vehículo:', vehiculoError)
      
      // Retornar el monto calculado para usar en onSuccess
      return { montoCalculado }
    },
    onSuccess: (result, variables) => {
      const duracion = calcularDuracion(variables.sesion.hora_entrada)
      const monto = result.montoCalculado
      
      toast.success(
        `Salida procesada: ${variables.sesion.placa} - ${formatCurrency(monto)} (${duracion})`
      )
      
      // Invalidar queries para actualizar dashboard
      queryClient.invalidateQueries({ queryKey: ['espacios'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['sesiones-activas'] })
      
      // Resetear modal
      setSesionSeleccionada(null)
      setShowConfirmacion(false)
      form.reset()
      onClose()
    },
    onError: (error) => {
      toast.error(`Error al procesar salida: ${error.message}`)
    }
  })

  const handleSesionSelect = async (sesion: SesionParqueo) => {
    setSesionSeleccionada(sesion)
    setCalculandoTarifa(true)
    
    try {
      // Calcular monto con pricing dinámico
      const monto = await calcularTarifaDinamicaCompleta(
        sesion.tipo_vehiculo,
        new Date(sesion.hora_entrada)
      )
      
      setMontoCalculado(monto)
      form.setValue('monto_recibido', monto)
    } catch (error) {
      console.warn('Error calculando tarifa dinámica, usando fallback:', error)
      // Fallback a cálculo tradicional
      const monto = calcularTarifa(
        sesion.tipo_vehiculo,
        new Date(sesion.hora_entrada)
      )
      setMontoCalculado(monto)
      form.setValue('monto_recibido', monto)
    } finally {
      setCalculandoTarifa(false)
    }
    
    setShowConfirmacion(true)
  }

  const onSubmit = (data: SalidaFormData) => {
    if (!sesionSeleccionada) return

    procesarSalidaMutation.mutate({
      sesion: sesionSeleccionada,
      metodo_pago: data.metodo_pago,
      monto_recibido: data.monto_recibido
    })
  }

  const metodoPagoIcons = {
    efectivo: <Banknote className="w-4 h-4" />,
    tarjeta: <CreditCard className="w-4 h-4" />,
    yape: <Smartphone className="w-4 h-4" />,
    plin: <Smartphone className="w-4 h-4" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            Procesar Salida de Vehículo
          </DialogTitle>
        </DialogHeader>

        {!showConfirmacion ? (
          // Paso 1: Búsqueda y selección de vehículo
          <div className="space-y-4">
            <Form {...form}>
              <FormField
                control={form.control}
                name="busqueda_placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buscar Vehículo por Placa</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ABC-123"
                        className="uppercase"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value.toUpperCase())
                          setSesionSeleccionada(null)
                          setShowConfirmacion(false)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>

            {/* Lista de vehículos encontrados */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loadingSesiones ? (
                <div className="text-center py-4 text-gray-500">
                  Buscando vehículos...
                </div>
              ) : sesionesActivas.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {placaBusquedaValue.length >= 3 
                    ? 'No se encontraron vehículos activos con esa placa'
                    : 'Ingrese al menos 3 caracteres para buscar'
                  }
                </div>
              ) : (
                sesionesActivas.map((sesion) => {
                  const duracion = calcularDuracion(sesion.hora_entrada)

                  return (
                    <Card 
                      key={sesion.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSesionSelect(sesion)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {sesion.tipo_vehiculo === 'auto' ? (
                              <Car className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Bike className="w-5 h-5 text-green-600" />
                            )}
                            
                            <div>
                              <h3 className="font-semibold text-lg">{sesion.placa}</h3>
                              <p className="text-sm text-gray-600">
                                Espacio {sesion.espacio_numero}
                                {/* Propietario no disponible en sesión directamente */}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                              <Clock className="w-3 h-3" />
                              {duracion}
                            </div>
                            <MontoSesion sesion={sesion} />
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Entrada: {formatDateTime(sesion.hora_entrada)}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          // Paso 2: Confirmación de pago
          <div className="space-y-4">
            {/* Resumen del vehículo */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {sesionSeleccionada?.tipo_vehiculo === 'auto' ? (
                      <Car className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Bike className="w-5 h-5 text-green-600" />
                    )}
                    <h3 className="text-xl font-bold">{sesionSeleccionada?.placa}</h3>
                    <Badge variant="outline">Espacio {sesionSeleccionada?.espacio_numero}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Entrada:</span>
                    <br />
                    {sesionSeleccionada && formatDateTime(sesionSeleccionada.hora_entrada)}
                  </div>
                  <div>
                    <span className="font-medium">Duración:</span>
                    <br />
                    {sesionSeleccionada && calcularDuracion(sesionSeleccionada.hora_entrada)}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total a cobrar:</span>
                    <span className="text-2xl font-bold text-blue-700">
                      {calculandoTarifa ? (
                        <span className="text-gray-400">Calculando...</span>
                      ) : (
                        formatCurrency(montoCalculado)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Formulario de pago */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="metodo_pago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {['efectivo', 'tarjeta', 'yape', 'plin'].map((metodo) => (
                          <Button
                            key={metodo}
                            type="button"
                            variant={field.value === metodo ? 'default' : 'outline'}
                            onClick={() => field.onChange(metodo)}
                            className="flex items-center gap-2 justify-start"
                          >
                            {metodoPagoIcons[metodo as keyof typeof metodoPagoIcons]}
                            {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monto_recibido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Recibido (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="6.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Botones de acción */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowConfirmacion(false)
                      setSesionSeleccionada(null)
                    }}
                    className="flex-1"
                    disabled={procesarSalidaMutation.isPending}
                  >
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={procesarSalidaMutation.isPending}
                  >
                    {procesarSalidaMutation.isPending ? 'Procesando...' : 'Confirmar Salida'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}