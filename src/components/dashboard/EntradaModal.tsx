'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Car, Bike, Clock, ParkingCircle } from 'lucide-react'
import { toast } from 'sonner'

import { 
  type Espacio 
} from '@/types/database'
import { 
  validarFormatoPlaca, 
  SISTEMA_CONFIG,
  formatDateTime 
} from '@/lib/utils/calculations'
import { useAuth } from '@/lib/hooks/useAuth'

// Schema de validación para entrada de vehículo
const entradaSchema = z.object({
  placa: z
    .string()
    .min(7, 'La placa debe tener al menos 7 caracteres')
    .max(8, 'La placa no puede tener más de 8 caracteres')
    .refine(validarFormatoPlaca, {
      message: 'Formato de placa inválido. Use ABC-123 o ABC-1234'
    }),
  tipo_vehiculo: z.enum(['auto', 'moto']),
  espacio_numero: z
    .number()
    .min(1, 'El número de espacio debe ser mayor a 0')
    .max(SISTEMA_CONFIG.TOTAL_ESPACIOS, `El espacio no puede ser mayor a ${SISTEMA_CONFIG.TOTAL_ESPACIOS}`)
})

type EntradaFormData = z.infer<typeof entradaSchema>

interface EntradaModalProps {
  isOpen: boolean
  onClose: () => void
  espaciosDisponibles?: Espacio[]
  espacioSeleccionado?: number
}

export function EntradaModal({ 
  isOpen, 
  onClose, 
  espaciosDisponibles = [],
  espacioSeleccionado 
}: EntradaModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const form = useForm<EntradaFormData>({
    resolver: zodResolver(entradaSchema),
    defaultValues: {
      placa: '',
      tipo_vehiculo: 'auto',
      espacio_numero: espacioSeleccionado || undefined
    }
  })

  // Mutación para crear nueva sesión
  const crearSesionMutation = useMutation({
    mutationFn: async (data: EntradaFormData): Promise<void> => {
      if (!user?.id) throw new Error('Usuario no autenticado')

      // 1. Verificar que el espacio esté disponible
      const { data: espacio, error: espacioError } = await supabase
        .from('espacios')
        .select('*')
        .eq('numero', data.espacio_numero)
        .single()

      if (espacioError) throw espacioError
      if (espacio.estado !== 'disponible') {
        throw new Error(`El espacio ${data.espacio_numero} no está disponible`)
      }

      // 2. Verificar si ya existe sesión activa para esta placa
      const { data: sesionExistente, error: sesionError } = await supabase
        .from('sesiones_parqueo')
        .select('*')
        .eq('placa', data.placa.toUpperCase())
        .eq('is_active', true)
        .maybeSingle()

      if (sesionError) throw sesionError
      if (sesionExistente) {
        throw new Error(`El vehículo ${data.placa.toUpperCase()} ya está en el estacionamiento`)
      }

      // 3. Crear o actualizar registro del vehículo (usando upsert)
      const { error: vehiculoError } = await supabase
        .from('vehiculos')
        .upsert({
          placa: data.placa.toUpperCase(),
          tipo_vehiculo: data.tipo_vehiculo,
          visit_count: 1,
          last_visit: new Date().toISOString()
        }, {
          onConflict: 'placa',
          ignoreDuplicates: false
        })

      if (vehiculoError) throw vehiculoError

      // 4. Crear sesión de parqueo con schema híbrido
      const { error: insertSesionError } = await supabase
        .from('sesiones_parqueo')
        .insert({
          placa: data.placa.toUpperCase(),
          tipo_vehiculo: data.tipo_vehiculo,
          espacio_numero: data.espacio_numero,
          hora_entrada: new Date().toISOString(),
          estado_pago: 'pendiente',
          procesado_por: user.id
        })

      if (insertSesionError) throw insertSesionError

      // 5. Marcar espacio como ocupado
      const { error: updateError } = await supabase
        .from('espacios')
        .update({ estado: 'ocupado' })
        .eq('numero', data.espacio_numero)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      toast.success('Vehículo ingresado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['espacios'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      form.reset()
      onClose()
    },
    onError: (error) => {
      toast.error(`Error al ingresar vehículo: ${error.message}`)
    }
  })

  const onSubmit = (data: EntradaFormData) => {
    crearSesionMutation.mutate(data)
  }

  const espaciosLibres = espaciosDisponibles.filter(e => e.estado === 'disponible')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ParkingCircle className="w-5 h-5" />
            Registrar Entrada de Vehículo
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Información del espacio seleccionado */}
            {espacioSeleccionado && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <ParkingCircle className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Espacio seleccionado: {espacioSeleccionado}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campo Placa */}
            <FormField
              control={form.control}
              name="placa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa del Vehículo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC-123"
                      className="uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Tipo de Vehículo */}
            <FormField
              control={form.control}
              name="tipo_vehiculo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Vehículo</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'auto' ? 'default' : 'outline'}
                      onClick={() => field.onChange('auto')}
                      className="flex items-center gap-2"
                    >
                      <Car className="w-4 h-4" />
                      Auto (S/6.00/h)
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'moto' ? 'default' : 'outline'}
                      onClick={() => field.onChange('moto')}
                      className="flex items-center gap-2"
                    >
                      <Bike className="w-4 h-4" />
                      Moto (S/3.00/h)
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Número de Espacio */}
            <FormField
              control={form.control}
              name="espacio_numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Espacio</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="1"
                      max={SISTEMA_CONFIG.TOTAL_ESPACIOS}
                      placeholder="Número del espacio"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Información de espacios disponibles */}
            {espaciosLibres.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-1">Espacios disponibles:</p>
                    <div className="flex flex-wrap gap-1">
                      {espaciosLibres.slice(0, 10).map((espacio) => (
                        <Badge 
                          key={espacio.id} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-green-100"
                          onClick={() => form.setValue('espacio_numero', espacio.numero)}
                        >
                          {espacio.numero}
                        </Badge>
                      ))}
                      {espaciosLibres.length > 10 && (
                        <span className="text-xs text-green-600">
                          +{espaciosLibres.length - 10} más
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información del sistema */}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Hora de entrada: {formatDateTime(new Date())}</span>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={crearSesionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={crearSesionMutation.isPending}
              >
                {crearSesionMutation.isPending ? 'Procesando...' : 'Registrar Entrada'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}