'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/providers/ToastProvider'
import { supabase } from '@/lib/supabase/client'
import { 
  ParkingSquare,
  Grid3X3,
  List,
  Search,
  Filter,
  Car,
  Bike,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  Edit,
  Wrench
} from 'lucide-react'

interface Espacio {
  id: string
  numero: number
  estado: 'disponible' | 'ocupado' | 'mantenimiento'
  tarifa_auto: number
  tarifa_moto: number
  created_at: string
  updated_at: string
  last_occupied_at?: string
  maintenance_notes?: string
}

interface SesionActiva {
  placa: string
  tipo_vehiculo: 'auto' | 'moto'
  hora_entrada: string
  tiempo_transcurrido: string
}

interface EspacioConSesion extends Espacio {
  sesion_activa?: SesionActiva
}

const EspaciosPage = () => {
  const [espacios, setEspacios] = useState<EspacioConSesion[]>([])
  const [vistaGrid, setVistaGrid] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [busquedaNumero, setBusquedaNumero] = useState('')
  const [loading, setLoading] = useState(false)

  const { success, error } = useToast()

  useEffect(() => {
    cargarEspacios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarEspacios = async () => {
    try {
      setLoading(true)
      
      // 1. Cargar todos los espacios
      const { data: espaciosData, error: espaciosError } = await supabase
        .from('espacios')
        .select('*')
        .order('numero')

      if (espaciosError) throw espaciosError

      // 2. Cargar sesiones activas
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones_parqueo')
        .select(`
          placa,
          espacio_numero,
          tipo_vehiculo,
          hora_entrada,
          is_active
        `)
        .eq('is_active', true)

      if (sesionesError) throw sesionesError

      // 3. Combinar espacios con sesiones activas
      const espaciosConSesiones: EspacioConSesion[] = (espaciosData || []).map(espacio => {
        const sesionActiva = sesionesData?.find(s => s.espacio_numero === espacio.numero)
        
        let sesion_activa: SesionActiva | undefined = undefined
        if (sesionActiva) {
          const horaEntrada = new Date(sesionActiva.hora_entrada)
          const ahora = new Date()
          const tiempoTranscurrido = Math.floor((ahora.getTime() - horaEntrada.getTime()) / (1000 * 60)) // minutos
          
          sesion_activa = {
            placa: sesionActiva.placa,
            tipo_vehiculo: sesionActiva.tipo_vehiculo,
            hora_entrada: sesionActiva.hora_entrada,
            tiempo_transcurrido: `${Math.floor(tiempoTranscurrido / 60)}h ${tiempoTranscurrido % 60}m`
          }
        }

        return {
          ...espacio,
          sesion_activa
        }
      })

      setEspacios(espaciosConSesiones)
      success('Espacios actualizados correctamente')
      
    } catch (err) {
      console.error('Error cargando espacios:', err)
      error('Error cargando espacios')
    } finally {
      setLoading(false)
    }
  }

  const cambiarEstadoEspacio = async (espacio: EspacioConSesion, nuevoEstado: 'disponible' | 'ocupado' | 'mantenimiento') => {
    try {
      // Actualizar estado en Supabase
      const { error: updateError } = await supabase
        .from('espacios')
        .update({ estado: nuevoEstado })
        .eq('numero', espacio.numero)

      if (updateError) throw updateError

      // Si se libera un espacio ocupado, cerrar la sesión activa
      if (nuevoEstado === 'disponible' && espacio.sesion_activa) {
        await supabase
          .from('sesiones_parqueo')
          .update({ 
            hora_salida: new Date().toISOString(),
            estado_pago: 'pendiente'
          })
          .eq('espacio_numero', espacio.numero)
          .eq('is_active', true)
      }

      // Recargar espacios para reflejar cambios
      await cargarEspacios()
      
      success(`Espacio ${espacio.numero} cambiado a ${nuevoEstado}`)
    } catch (err) {
      console.error('Error cambiando estado:', err)
      error('Error cambiando estado del espacio')
    }
  }

  const espaciosFiltrados = espacios.filter(espacio => {
    const coincideEstado = filtroEstado === 'todos' || espacio.estado === filtroEstado
    const coincideNumero = !busquedaNumero || espacio.numero.toString().includes(busquedaNumero)
    return coincideEstado && coincideNumero
  })

  const estadisticas = {
    total: espacios.length,
    disponibles: espacios.filter(e => e.estado === 'disponible').length,
    ocupados: espacios.filter(e => e.estado === 'ocupado').length,
    mantenimiento: espacios.filter(e => e.estado === 'mantenimiento').length,
    ocupacion: espacios.length > 0 ? ((espacios.filter(e => e.estado === 'ocupado').length / espacios.length) * 100).toFixed(1) : '0.0'
  }

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
      case 'ocupado': return 'bg-red-100 border-red-300 text-red-700'
      case 'mantenimiento': return 'bg-yellow-100 border-yellow-300 text-yellow-700'
      default: return 'bg-gray-100 border-gray-300 text-gray-700'
    }
  }

  const getIconoEstado = (estado: string) => {
    switch (estado) {
      case 'disponible': return <CheckCircle className="h-4 w-4" />
      case 'ocupado': return <Car className="h-4 w-4" />
      case 'mantenimiento': return <AlertCircle className="h-4 w-4" />
      default: return <ParkingSquare className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestión de Espacios</h1>
            <p className="text-lg text-gray-600 mt-1">Monitorea y administra todos los espacios de parqueo</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={cargarEspacios} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={vistaGrid ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setVistaGrid(true)}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={!vistaGrid ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setVistaGrid(false)}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ParkingSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{estadisticas.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Disponibles</p>
                <p className="text-2xl font-bold text-green-700">{estadisticas.disponibles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-red-600">Ocupados</p>
                <p className="text-2xl font-bold text-red-700">{estadisticas.ocupados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Mantenimiento</p>
                <p className="text-2xl font-bold text-yellow-700">{estadisticas.mantenimiento}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">%</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Ocupación</p>
                <p className="text-2xl font-bold text-blue-700">{estadisticas.ocupacion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por número..."
                value={busquedaNumero}
                onChange={(e) => setBusquedaNumero(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="disponible">Disponibles</SelectItem>
                  <SelectItem value="ocupado">Ocupados</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="outline" className="ml-auto">
              {espaciosFiltrados.length} espacios
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Vista de Espacios */}
      {vistaGrid ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Vista de Cuadrícula
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-3">
              {espaciosFiltrados.map((espacio) => (
                <Dialog key={espacio.id}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-20 flex flex-col gap-1 p-2 transition-all duration-200 ${getColorEstado(espacio.estado)} ${espacio.estado === 'disponible' ? 'hover:scale-105' : ''}`}
                    >
                      <div className="text-lg font-bold">{espacio.numero}</div>
                      <div className="text-xs flex items-center gap-1">
                        {getIconoEstado(espacio.estado)}
                        {espacio.sesion_activa && (
                          <span className="font-mono text-xs">
                            {espacio.sesion_activa.placa.split('-')[0]}
                          </span>
                        )}
                      </div>
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ParkingSquare className="h-5 w-5" />
                        Espacio #{espacio.numero}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Estado</Label>
                          <div className="flex items-center gap-2 mt-1">
                            {getIconoEstado(espacio.estado)}
                            <Badge className={getColorEstado(espacio.estado)}>
                              {espacio.estado}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Ubicación</Label>
                          <div className="text-sm text-gray-600 mt-1">
                            Sector {Math.ceil(espacio.numero / 10)} - Fila {String.fromCharCode(65 + Math.floor((espacio.numero - 1) / 5))}
                          </div>
                        </div>
                      </div>

                      {espacio.sesion_activa && (
                        <div className="border rounded-lg p-3 bg-blue-50">
                          <Label className="text-sm font-medium text-blue-800">Vehículo Actual</Label>
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2">
                              {espacio.sesion_activa.tipo_vehiculo === 'auto' ? (
                                <Car className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Bike className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="font-semibold text-blue-900">
                                {espacio.sesion_activa.placa}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                              <Clock className="h-3 w-3" />
                              <span>Tiempo: {espacio.sesion_activa.tiempo_transcurrido}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        {espacio.estado !== 'disponible' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cambiarEstadoEspacio(espacio, 'disponible')}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Liberar
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cambiarEstadoEspacio(espacio, 'mantenimiento')}
                          className="flex-1"
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Mantenimiento
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Vista de Lista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {espaciosFiltrados.map((espacio) => (
                <div
                  key={espacio.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      espacio.estado === 'disponible' ? 'bg-green-500' :
                      espacio.estado === 'ocupado' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    
                    <div>
                      <div className="font-semibold">Espacio #{espacio.numero}</div>
                      <div className="text-sm text-gray-600">Sector {Math.ceil(espacio.numero / 10)} - Fila {String.fromCharCode(65 + Math.floor((espacio.numero - 1) / 5))}</div>
                    </div>

                    {espacio.sesion_activa && (
                      <div className="flex items-center gap-2 ml-8">
                        {espacio.sesion_activa.tipo_vehiculo === 'auto' ? (
                          <Car className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Bike className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-semibold">{espacio.sesion_activa.placa}</span>
                        <Badge variant="outline">{espacio.sesion_activa.tiempo_transcurrido}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getColorEstado(espacio.estado)}>
                      {espacio.estado}
                    </Badge>
                    
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EspaciosPage