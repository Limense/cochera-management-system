'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Car, 
  Bike, 
  Search, 
  Calendar,
  Phone,
  User,
  History,
  Edit,
  MapPin
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { type Vehiculo } from '@/types/database'

// Schema para editar vehículo
const vehiculoSchema = z.object({
  propietario: z.string().optional(),
  telefono: z.string().optional(),
  color: z.string().optional(),
  marca: z.string().optional()
})

type VehiculoFormData = z.infer<typeof vehiculoSchema>

type SesionSummary = {
  id: string
  hora_entrada: string
  hora_salida?: string
  monto_calculado?: number
  estado_pago: string
  espacio_numero: number
  is_active: boolean
}

interface VehiculoConSesiones extends Vehiculo {
  sesiones_recientes?: SesionSummary[]
  sesion_activa?: SesionSummary
  total_ingresos?: number
}

export default function VehiculosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedVehiculo, setSelectedVehiculo] = useState<VehiculoConSesiones | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Query para obtener todos los vehículos con datos adicionales
  const { data: vehiculos = [], isLoading } = useQuery({
    queryKey: ['vehiculos-completos'],
    queryFn: async (): Promise<VehiculoConSesiones[]> => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select(`
          *,
          sesiones_recientes:sesiones_parqueo!inner(
            id,
            hora_entrada,
            hora_salida,
            monto_calculado,
            estado_pago,
            espacio_numero,
            is_active
          )
        `)
        .order('last_visit', { ascending: false })

      if (error) throw error

      // Procesar datos para agregar información adicional
      return (data || []).map(vehiculo => {
        const sesiones: SesionSummary[] = vehiculo.sesiones_recientes || []
        const sesionActiva = sesiones.find((s: SesionSummary) => s.is_active)
        const totalIngresos = sesiones
          .filter((s: SesionSummary) => s.estado_pago === 'pagado')
          .reduce((sum: number, s: SesionSummary) => sum + (s.monto_calculado || 0), 0)

        return {
          ...vehiculo,
          sesiones_recientes: sesiones.slice(0, 5), // Solo últimas 5
          sesion_activa: sesionActiva,
          total_ingresos: totalIngresos
        }
      })
    },
    refetchInterval: 30000,
  })

  // Filtrar vehículos por búsqueda
  const vehiculosFiltrados = useMemo(() => {
    if (!searchTerm) return vehiculos
    
    return vehiculos.filter(vehiculo => 
      vehiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehiculo.propietario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehiculo.marca?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [vehiculos, searchTerm])

  // Form setup
  const form = useForm<VehiculoFormData>({
    resolver: zodResolver(vehiculoSchema),
    defaultValues: {
      propietario: '',
      telefono: '',
      color: '',
      marca: ''
    }
  })

  // Mutation para actualizar vehículo
  const updateVehiculoMutation = useMutation({
    mutationFn: async (data: VehiculoFormData): Promise<void> => {
      if (!selectedVehiculo) throw new Error('No hay vehículo seleccionado')

      const { error } = await supabase
        .from('vehiculos')
        .update({
          propietario: data.propietario || null,
          telefono: data.telefono || null,
          color: data.color || null,
          marca: data.marca || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedVehiculo.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Vehículo actualizado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['vehiculos-completos'] })
      setEditModalOpen(false)
      setSelectedVehiculo(null)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    }
  })

  const handleEditVehiculo = (vehiculo: VehiculoConSesiones) => {
    setSelectedVehiculo(vehiculo)
    form.reset({
      propietario: vehiculo.propietario || '',
      telefono: vehiculo.telefono || '',
      color: vehiculo.color || '',
      marca: vehiculo.marca || ''
    })
    setEditModalOpen(true)
  }

  const handleShowHistory = (vehiculo: VehiculoConSesiones) => {
    setSelectedVehiculo(vehiculo)
    setHistoryModalOpen(true)
  }

  const onSubmit = (data: VehiculoFormData) => {
    updateVehiculoMutation.mutate(data)
  }

  const getTipoIcon = (tipo: 'auto' | 'moto') => {
    return tipo === 'auto' ? 
      <Car className="w-4 h-4 text-blue-600" /> : 
      <Bike className="w-4 h-4 text-green-600" />
  }

  const getEstadoBadge = (vehiculo: VehiculoConSesiones) => {
    if (vehiculo.sesion_activa) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <MapPin className="w-3 h-3 mr-1" />
          Espacio {vehiculo.sesion_activa.espacio_numero}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        Disponible
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Vehículos</h1>
          <p className="text-gray-600">Registro de vehículos y clientes frecuentes</p>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Vehículos</p>
                <p className="text-2xl font-bold">{vehiculos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <div>
                <p className="text-sm text-gray-600">Activos Ahora</p>
                <p className="text-2xl font-bold text-red-600">
                  {vehiculos.filter(v => v.sesion_activa).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Con Propietario</p>
                <p className="text-2xl font-bold text-green-600">
                  {vehiculos.filter(v => v.propietario).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Frecuentes</p>
                <p className="text-2xl font-bold text-purple-600">
                  {vehiculos.filter(v => v.visit_count >= 5).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Vehículos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por placa, propietario o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de vehículos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Vehículos Registrados ({vehiculosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando vehículos...
            </div>
          ) : vehiculosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm 
                ? `No se encontraron vehículos con "${searchTerm}"`
                : 'No hay vehículos registrados'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Visitas</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead>Total Ingresos</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiculosFiltrados.map((vehiculo) => (
                    <TableRow key={vehiculo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTipoIcon(vehiculo.tipo_vehiculo)}
                          <div>
                            <p className="font-bold">{vehiculo.placa}</p>
                            {vehiculo.marca && (
                              <p className="text-sm text-gray-600">
                                {vehiculo.marca} {vehiculo.color && `• ${vehiculo.color}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {vehiculo.propietario ? (
                          <div>
                            <p className="font-medium">{vehiculo.propietario}</p>
                            {vehiculo.telefono && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {vehiculo.telefono}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin propietario</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {getEstadoBadge(vehiculo)}
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">
                          {vehiculo.visit_count} visitas
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm">
                          {formatDateTime(vehiculo.last_visit)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(vehiculo.total_ingresos || 0)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditVehiculo(vehiculo)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowHistory(vehiculo)}
                          >
                            <History className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar Vehículo {selectedVehiculo?.placa}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="propietario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propietario</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del propietario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="999-888-777" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Toyota, Honda..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Blanco, Azul..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateVehiculoMutation.isPending}
                >
                  {updateVehiculoMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de historial */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Historial de {selectedVehiculo?.placa}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedVehiculo?.sesiones_recientes && selectedVehiculo.sesiones_recientes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Espacio</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVehiculo.sesiones_recientes.map((sesion) => (
                      <TableRow key={sesion.id}>
                        <TableCell>#{sesion.espacio_numero}</TableCell>
                        <TableCell>{formatDateTime(sesion.hora_entrada)}</TableCell>
                        <TableCell>
                          {sesion.hora_salida ? formatDateTime(sesion.hora_salida) : 'Activo'}
                        </TableCell>
                        <TableCell>
                          {sesion.hora_salida ? (
                            (() => {
                              const entrada = new Date(sesion.hora_entrada)
                              const salida = new Date(sesion.hora_salida)
                              const diffMs = salida.getTime() - entrada.getTime()
                              const horas = Math.floor(diffMs / (1000 * 60 * 60))
                              const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                              return `${horas}h ${minutos}min`
                            })()
                          ) : (
                            'En curso'
                          )}
                        </TableCell>
                        <TableCell>
                          {sesion.monto_calculado ? formatCurrency(sesion.monto_calculado) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={sesion.is_active ? 'destructive' : 
                              sesion.estado_pago === 'pagado' ? 'default' : 'secondary'}
                          >
                            {sesion.is_active ? 'Activo' : sesion.estado_pago}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay historial de sesiones para este vehículo
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}