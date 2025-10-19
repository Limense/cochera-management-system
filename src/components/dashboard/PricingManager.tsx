'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { 
  Plus,
  Settings,
  Clock,
  Car,
  AlertCircle,
  Zap
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { TarifaDinamica } from '@/types/database'
import { 
  PLANTILLAS_TARIFAS, 
  formatearHorario, 
  formatearDiasSemana 
} from '@/lib/utils/pricing'

// Esquema de validación para nueva tarifa
const nuevaTarifaSchema = z.object({
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  tipo_vehiculo: z.enum(['auto', 'moto'], {
    message: 'Selecciona un tipo de vehículo válido'
  }),
  hora_inicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  hora_fin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  dias_semana: z.array(z.number().min(0).max(6)).min(1, 'Selecciona al menos un día'),
  tarifa_primera_hora: z.number().min(0.1, 'Tarifa debe ser mayor a 0'),
  tarifa_hora_adicional: z.number().min(0.1, 'Tarifa debe ser mayor a 0'),
  tarifa_minima: z.number().min(0.1, 'Tarifa mínima debe ser mayor a 0'),
  tarifa_maxima: z.number().optional(),
  prioridad: z.number().min(1).max(10, 'Prioridad debe estar entre 1 y 10')
})

type NuevaTarifaForm = z.infer<typeof nuevaTarifaSchema>

const DIAS_SEMANA = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' }
]

export function PricingManager() {
  const { profile } = useAuth()
  const [modalNuevaTarifa, setModalNuevaTarifa] = useState(false)
  const [modalPlantillas, setModalPlantillas] = useState(false)
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([])
  const queryClient = useQueryClient()

  // Query para obtener tarifas
  const { data: pricingData, isLoading } = useQuery({
    queryKey: ['pricing', profile?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        adminId: profile?.id || ''
      })
      
      const response = await fetch(`/api/pricing?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar tarifas')
      }
      
      return response.json()
    },
    enabled: !!profile?.id
  })

  // Formulario para nueva tarifa
  const form = useForm<NuevaTarifaForm>({
    resolver: zodResolver(nuevaTarifaSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      tipo_vehiculo: 'auto',
      hora_inicio: '06:00',
      hora_fin: '22:00',
      dias_semana: [1, 2, 3, 4, 5], // Lunes a viernes por defecto
      tarifa_primera_hora: 5.00,
      tarifa_hora_adicional: 3.00,
      tarifa_minima: 2.50,
      prioridad: 1
    }
  })

  // Mutación para crear tarifa
  const crearTarifaMutation = useMutation({
    mutationFn: async (data: NuevaTarifaForm) => {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: profile?.id,
          nombre: data.nombre,
          descripcion: data.descripcion,
          tipoVehiculo: data.tipo_vehiculo,
          horaInicio: data.hora_inicio,
          horaFin: data.hora_fin,
          diasSemana: data.dias_semana,
          tarifaPrimeraHora: data.tarifa_primera_hora,
          tarifaHoraAdicional: data.tarifa_hora_adicional,
          tarifaMinima: data.tarifa_minima,
          tarifaMaxima: data.tarifa_maxima,
          prioridad: data.prioridad
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear tarifa')
      }

      return result
    },
    onSuccess: () => {
      toast.success('Tarifa creada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['pricing'] })
      setModalNuevaTarifa(false)
      form.reset()
      setDiasSeleccionados([1, 2, 3, 4, 5])
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear tarifa')
    }
  })

  // Mutación para activar/desactivar tarifa
  const toggleTarifaMutation = useMutation({
    mutationFn: async ({ tarifaId, isActive }: { tarifaId: string, isActive: boolean }) => {
      const response = await fetch('/api/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: profile?.id,
          tarifaId,
          is_active: isActive
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar tarifa')
      }

      return result
    },
    onSuccess: () => {
      toast.success('Tarifa actualizada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['pricing'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar tarifa')
    }
  })

  const handleSubmit = (data: NuevaTarifaForm) => {
    crearTarifaMutation.mutate(data)
  }

  const toggleDiaSeleccionado = (dia: number) => {
    const nuevos = diasSeleccionados.includes(dia)
      ? diasSeleccionados.filter(d => d !== dia)
      : [...diasSeleccionados, dia]
    
    setDiasSeleccionados(nuevos)
    form.setValue('dias_semana', nuevos)
  }

  const aplicarPlantilla = (plantilla: typeof PLANTILLAS_TARIFAS[keyof typeof PLANTILLAS_TARIFAS]) => {
    form.setValue('nombre', plantilla.nombre)
    form.setValue('descripcion', plantilla.descripcion)
    form.setValue('tipo_vehiculo', plantilla.tipo_vehiculo)
    form.setValue('hora_inicio', plantilla.hora_inicio)
    form.setValue('hora_fin', plantilla.hora_fin)
    form.setValue('dias_semana', plantilla.dias_semana)
    form.setValue('tarifa_primera_hora', plantilla.tarifa_primera_hora)
    form.setValue('tarifa_hora_adicional', plantilla.tarifa_hora_adicional)
    form.setValue('tarifa_minima', plantilla.tarifa_minima)
    form.setValue('tarifa_maxima', plantilla.tarifa_maxima)
    form.setValue('prioridad', plantilla.prioridad)
    
    setDiasSeleccionados(plantilla.dias_semana)
    setModalPlantillas(false)
    toast.success(`Plantilla "${plantilla.nombre}" aplicada`)
  }

  const tarifas = pricingData?.tarifas || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Tarifas</h1>
          <p className="text-gray-600">Configuración de pricing dinámico por horarios</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setModalPlantillas(true)}
          >
            <Zap className="w-4 h-4 mr-2" />
            Plantillas
          </Button>
          
          <Button 
            onClick={() => setModalNuevaTarifa(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarifa
          </Button>
        </div>
      </div>

      {/* Configuración actual */}
      {pricingData?.configuracion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Configuración Global</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <p className="text-sm text-gray-600">Redondeo</p>
                <p className="font-semibold">{pricingData.configuracion.redondeo_minutos} min</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-sm text-gray-600">Tiempo Gracia</p>
                <p className="font-semibold">{pricingData.configuracion.tiempo_gracia_minutos} min</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Badge variant={pricingData.configuracion.aplicar_tarifa_nocturna ? 'default' : 'secondary'}>
                  Tarifa Nocturna {pricingData.configuracion.aplicar_tarifa_nocturna ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Badge variant={pricingData.configuracion.aplicar_tarifa_fin_semana ? 'default' : 'secondary'}>
                  Fin de Semana {pricingData.configuracion.aplicar_tarifa_fin_semana ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de tarifas */}
      <Card>
        <CardHeader>
          <CardTitle>Tarifas Configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tarifas.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay tarifas configuradas
              </h3>
              <p className="text-gray-600 mb-4">
                Crea tu primera tarifa para comenzar con el pricing dinámico
              </p>
              <Button onClick={() => setModalNuevaTarifa(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Tarifa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarifa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Primera Hora</TableHead>
                  <TableHead>Hora Adicional</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifas.map((tarifa: TarifaDinamica) => (
                  <TableRow key={tarifa.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{tarifa.nombre}</p>
                        {tarifa.descripcion && (
                          <p className="text-sm text-gray-500">{tarifa.descripcion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tarifa.tipo_vehiculo === 'auto' ? 'default' : 'secondary'}>
                        <Car className="w-3 h-3 mr-1" />
                        {tarifa.tipo_vehiculo === 'auto' ? 'Auto' : 'Moto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {formatearHorario(tarifa.hora_inicio, tarifa.hora_fin)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatearDiasSemana(tarifa.dias_semana)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">S/ {tarifa.tarifa_primera_hora.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">S/ {tarifa.tarifa_hora_adicional.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tarifa.prioridad}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={tarifa.is_active}
                        onCheckedChange={(checked) => 
                          toggleTarifaMutation.mutate({
                            tarifaId: tarifa.id,
                            isActive: checked
                          })
                        }
                        disabled={toggleTarifaMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para nueva tarifa */}
      <Dialog open={modalNuevaTarifa} onOpenChange={setModalNuevaTarifa}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tarifa</DialogTitle>
            <DialogDescription>
              Configura una nueva tarifa dinámica por horarios
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Tarifa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Tarifa Diurna - Autos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_vehiculo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="auto">Autos</SelectItem>
                        <SelectItem value="moto">Motos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hora_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Inicio</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hora_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Fin</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dias_semana"
                render={() => (
                  <FormItem>
                    <FormLabel>Días de la Semana</FormLabel>
                    <div className="flex space-x-2">
                      {DIAS_SEMANA.map(dia => (
                        <Button
                          key={dia.value}
                          type="button"
                          variant={diasSeleccionados.includes(dia.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDiaSeleccionado(dia.value)}
                        >
                          {dia.label}
                        </Button>
                      ))}
                    </div>
                    <FormDescription>
                      Selecciona los días en que aplica esta tarifa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tarifa_primera_hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primera Hora (S/)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tarifa_hora_adicional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Adicional (S/)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tarifa_minima"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa Mínima (S/)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prioridad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad (1-10)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Mayor número = mayor prioridad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalNuevaTarifa(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={crearTarifaMutation.isPending}
                >
                  {crearTarifaMutation.isPending ? 'Creando...' : 'Crear Tarifa'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de plantillas */}
      <Dialog open={modalPlantillas} onOpenChange={setModalPlantillas}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plantillas de Tarifas</DialogTitle>
            <DialogDescription>
              Aplica plantillas predefinidas para configurar rápidamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PLANTILLAS_TARIFAS).map(([key, plantilla]) => (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => aplicarPlantilla(plantilla)}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{plantilla.nombre}</h3>
                    <Badge variant={plantilla.tipo_vehiculo === 'auto' ? 'default' : 'secondary'}>
                      {plantilla.tipo_vehiculo}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{plantilla.descripcion}</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">Horario:</span> {formatearHorario(plantilla.hora_inicio, plantilla.hora_fin)}</p>
                    <p><span className="font-medium">Días:</span> {formatearDiasSemana(plantilla.dias_semana)}</p>
                    <p><span className="font-medium">1ª Hora:</span> S/ {plantilla.tarifa_primera_hora}</p>
                    <p><span className="font-medium">Adicional:</span> S/ {plantilla.tarifa_hora_adicional}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}