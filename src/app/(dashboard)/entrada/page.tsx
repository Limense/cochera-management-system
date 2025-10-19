'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/providers/ToastProvider'
import { supabase } from '@/lib/supabase/client'
import { 
  Car,
  Bike,
  UserPlus,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Search,
  RotateCcw,
  Users,
  ParkingSquare
} from 'lucide-react'

// Interfaces basadas en el esquema SQL
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

interface FormularioEntrada {
  placa: string
  tipo_vehiculo: 'auto' | 'moto'
  nombre_conductor: string
  telefono: string
  espacio_id: string
}

const EntradaPage = () => {
  const [espaciosDisponibles, setEspaciosDisponibles] = useState<Espacio[]>([])
  const [formulario, setFormulario] = useState<FormularioEntrada>({
    placa: '',
    tipo_vehiculo: 'auto',
    nombre_conductor: '',
    telefono: '',
    espacio_id: ''
  })
  const [testInput, setTestInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<Espacio | null>(null)
  const [stats, setStats] = useState({
    disponibles: 0,
    total: 45,
    ocupados: 0,
    ocupacion: '0.0'
  })

  const { success, error } = useToast()

  // Cargar espacios disponibles al inicializar
  useEffect(() => {
    cargarEspaciosDisponibles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarEspaciosDisponibles = async () => {
    try {
      // Cargar espacios disponibles desde Supabase usando la función SQL
      const { data: espacios, error: espaciosError } = await supabase
        .rpc('espacios_disponibles')

      if (espaciosError) {
        console.error('Error cargando espacios:', espaciosError)
        error('Error cargando espacios disponibles')
        return
      }

      setEspaciosDisponibles(espacios || [])
      
      // Calcular estadísticas reales desde la base de datos
      const { data: statsData, error: statsError } = await supabase
        .from('espacios')
        .select('estado')

      if (statsError) {
        console.error('Error cargando estadísticas:', statsError)
      }

      const disponibles = espacios?.length || 0
      const total = 45
      const ocupados = statsData?.filter(e => e.estado === 'ocupado').length || 0
      const mantenimiento = statsData?.filter(e => e.estado === 'mantenimiento').length || 0
      const ocupacion = ((ocupados / total) * 100).toFixed(1)

      setStats({ disponibles, total, ocupados, ocupacion })
      
      console.log('Estadísticas cargadas:', { disponibles, ocupados, mantenimiento, total })
      
    } catch (err) {
      console.error('Error:', err)
      error('Error cargando espacios disponibles')
    }
  }

  const seleccionarEspacio = (espacio: Espacio) => {
    setEspacioSeleccionado(espacio)
    setFormulario(prev => ({ ...prev, espacio_id: espacio.id }))
    success(`Espacio ${espacio.numero} seleccionado`)
  }

  const registrarEntrada = async () => {
    // Validaciones
    if (!formulario.placa.trim()) {
      error('La placa es requerida')
      return
    }
    if (!formulario.nombre_conductor.trim()) {
      error('El nombre del conductor es requerido')
      return
    }
    if (!formulario.espacio_id || !espacioSeleccionado) {
      error('Debe seleccionar un espacio')
      return
    }

    try {
      setLoading(true)

      console.log('Iniciando registro de entrada para:', formulario.placa)

      // 1. Registrar/actualizar vehículo
      const { data: vehiculoExistente, error: vehiculoQueryError } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('placa', formulario.placa.trim())
        .single()

      if (vehiculoQueryError && vehiculoQueryError.code !== 'PGRST116') {
        console.error('Error consultando vehículo:', vehiculoQueryError)
        throw new Error(`Error consultando vehículo: ${vehiculoQueryError.message}`)
      }

      const vehiculoData = {
        placa: formulario.placa.trim(),
        tipo_vehiculo: formulario.tipo_vehiculo,
        propietario: formulario.nombre_conductor.trim(),
        telefono: formulario.telefono.trim() || null,
        last_visit: new Date().toISOString()
      }

      if (vehiculoExistente) {
        console.log('Actualizando vehículo existente:', vehiculoExistente.placa)
        // Actualizar vehículo existente
        const { error: updateError } = await supabase
          .from('vehiculos')
          .update({
            ...vehiculoData,
            visit_count: (vehiculoExistente.visit_count || 0) + 1
          })
          .eq('placa', formulario.placa.trim())
        
        if (updateError) {
          console.error('Error actualizando vehículo:', updateError)
          throw new Error(`Error actualizando vehículo: ${updateError.message}`)
        }
      } else {
        console.log('Creando nuevo vehículo:', formulario.placa)
        // Crear nuevo vehículo
        const { error: insertError } = await supabase
          .from('vehiculos')
          .insert([vehiculoData])
        
        if (insertError) {
          console.error('Error creando vehículo:', insertError)
          throw new Error(`Error creando vehículo: ${insertError.message}`)
        }
      }

      // 2. Crear sesión de parqueo
      const { error: sesionError } = await supabase
        .from('sesiones_parqueo')
        .insert([{
          placa: formulario.placa.trim(),
          espacio_numero: espacioSeleccionado?.numero,
          tipo_vehiculo: formulario.tipo_vehiculo,
          hora_entrada: new Date().toISOString(),
          estado_pago: 'pendiente'
        }])
        .select()

      if (sesionError) {
        console.error('Error creando sesión:', sesionError)
        throw new Error(`Error creando sesión: ${sesionError.message}`)
      }

      // 3. Actualizar estado del espacio
      const { error: espacioError } = await supabase
        .from('espacios')
        .update({ 
          estado: 'ocupado',
          last_occupied_at: new Date().toISOString()
        })
        .eq('numero', espacioSeleccionado?.numero)

      if (espacioError) {
        console.error('Error actualizando espacio:', espacioError)
        // No lanzamos error aquí porque la sesión ya se creó
      }

      // 4. Registrar en auditoría (opcional)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          await supabase
            .from('auditoria_logs')
            .insert([{
              usuario_id: userData.user.id,
              accion_tipo: 'entrada_vehiculo',
              tabla_afectada: 'sesiones_parqueo',
              detalles: {
                placa: formulario.placa.trim(),
                espacio: espacioSeleccionado?.numero,
                tipo_vehiculo: formulario.tipo_vehiculo
              }
            }])
        }
      } catch (auditError) {
        console.error('Error en auditoría (no crítico):', auditError)
        // No interrumpir el proceso por fallos de auditoría
      }

      // Actualizar lista de espacios disponibles
      await cargarEspaciosDisponibles()

      success(`¡Entrada registrada! Vehículo ${formulario.placa} en espacio ${espacioSeleccionado?.numero}`)
      
      // Limpiar formulario
      limpiarFormulario()

    } catch (err) {
      console.error('Error registrando entrada:', err)
      error('Error registrando la entrada')
    } finally {
      setLoading(false)
    }
  }

  const limpiarFormulario = () => {
    setFormulario({
      placa: '',
      tipo_vehiculo: 'auto',
      nombre_conductor: '',
      telefono: '',
      espacio_id: ''
    })
    setEspacioSeleccionado(null)
  }



  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-blue-600" />
              Entrada de Vehículos
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              Registra el ingreso de vehículos y asigna espacios disponibles
            </p>
          </div>
          
          <Button 
            onClick={cargarEspaciosDisponibles}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Actualizar Espacios
          </Button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Espacios Disponibles</p>
                <p className="text-2xl font-bold text-green-700">{stats.disponibles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-red-600">Espacios Ocupados</p>
                <p className="text-2xl font-bold text-red-700">{stats.ocupados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <ParkingSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Espacios</p>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">%</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Ocupación</p>
                <p className="text-2xl font-bold text-purple-700">{stats.ocupacion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Formulario de Entrada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Datos del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input de Prueba */}
            <div className="space-y-2 border p-3 rounded bg-yellow-50">
              <Label>🧪 Input de Prueba</Label>
              <Input
                type="text"
                placeholder="Escribe aquí para probar..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-blue-600">Valor: {testInput}</p>
            </div>
            
            {/* Placa */}
            <div className="space-y-2">
              <Label htmlFor="placa">Placa del Vehículo *</Label>
              <Input
                id="placa"
                type="text"
                placeholder="ABC-1234"
                value={formulario.placa}
                onChange={(e) => {
                  console.log('Escribiendo placa:', e.target.value)
                  setFormulario(prev => ({ ...prev, placa: e.target.value.toUpperCase() }))
                }}
                className="font-mono text-lg"
                autoComplete="off"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">Valor actual: {formulario.placa || '(vacío)'}</p>
            </div>

            {/* Tipo de Vehículo */}
            <div className="space-y-2">
              <Label>Tipo de Vehículo *</Label>
              <Select
                value={formulario.tipo_vehiculo}
                onValueChange={(value: 'auto' | 'moto') => 
                  setFormulario(prev => ({ ...prev, tipo_vehiculo: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Automóvil
                    </div>
                  </SelectItem>
                  <SelectItem value="moto">
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4" />
                      Motocicleta
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nombre del Conductor */}
            <div className="space-y-2">
              <Label htmlFor="conductor">Nombre del Conductor *</Label>
              <Input
                id="conductor"
                type="text"
                placeholder="Nombre completo"
                value={formulario.nombre_conductor}
                onChange={(e) => {
                  console.log('Escribiendo nombre:', e.target.value)
                  setFormulario(prev => ({ ...prev, nombre_conductor: e.target.value }))
                }}
                autoComplete="off"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">Nombre: {formulario.nombre_conductor || '(vacío)'}</p>
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono (Opcional)</Label>
              <Input
                id="telefono"
                placeholder="+57 300 123 4567"
                value={formulario.telefono}
                onChange={(e) => setFormulario(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>

            {/* Espacio Seleccionado */}
            {espacioSeleccionado && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Espacio Seleccionado</p>
                    <p className="text-sm text-blue-700">
                      Espacio #{espacioSeleccionado.numero} - Sector {Math.ceil(espacioSeleccionado.numero / 10)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">
                        {formulario.tipo_vehiculo === 'auto' 
                          ? espacioSeleccionado.tarifa_auto 
                          : espacioSeleccionado.tarifa_moto
                        }/h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Registro */}
            <Button
              onClick={registrarEntrada}
              disabled={loading || !formulario.placa || !formulario.nombre_conductor || !formulario.espacio_id}
              className="w-full gap-2 h-12 text-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Registrar Entrada
                </>
              )}
            </Button>

            <Button
              onClick={limpiarFormulario}
              variant="outline"
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar Formulario
            </Button>
          </CardContent>
        </Card>

        {/* Selección de Espacios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Espacios Disponibles
              <Badge variant="outline" className="ml-auto">
                {espaciosDisponibles.length} disponibles
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {espaciosDisponibles.length > 0 ? (
              <div className="grid grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                {espaciosDisponibles.map((espacio) => (
                  <Button
                    key={espacio.id}
                    variant={espacioSeleccionado?.id === espacio.id ? 'default' : 'outline'}
                    onClick={() => seleccionarEspacio(espacio)}
                    className={`h-16 flex flex-col gap-1 p-2 transition-all duration-200 ${
                      espacioSeleccionado?.id === espacio.id 
                        ? 'ring-2 ring-blue-500 bg-blue-600 text-white' 
                        : 'hover:bg-green-50 hover:border-green-300'
                    }`}
                  >
                    <div className="font-bold text-lg">{espacio.numero}</div>
                    <div className="text-xs opacity-75">
                      {formulario.tipo_vehiculo === 'auto' 
                        ? `$${espacio.tarifa_auto}/h` 
                        : `$${espacio.tarifa_moto}/h`
                      }
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay espacios disponibles</p>
                <p className="text-sm">Todos los espacios están ocupados en este momento</p>
                <Button 
                  onClick={cargarEspaciosDisponibles}
                  variant="outline" 
                  className="mt-4 gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información Adicional */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Información del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Tarifa por Hora</p>
                <p className="text-sm text-gray-600">Auto: $5,000 | Moto: $3,000</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Horario de Servicio</p>
                <p className="text-sm text-gray-600">24 horas, todos los días</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Search className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Tiempo Gracia</p>
                <p className="text-sm text-gray-600">15 minutos para salida</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EntradaPage