'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/providers/ToastProvider'
import { supabase } from '@/lib/supabase/client'
import { 
  LogOut,
  Search,
  Car,
  Bike,
  Clock,
  DollarSign,
  Receipt,
  CheckCircle,
  AlertCircle,
  Calculator,
  CreditCard,
  Banknote,
  QrCode,
  Timer,
  MapPin
} from 'lucide-react'

// Tipos basados en el esquema SQL
interface VehiculoActivo {
  id: string
  placa: string
  tipo_vehiculo: 'auto' | 'moto'
  espacio_numero: number
  hora_entrada: string
  session_id: string
  created_at: string
}

interface Cobro {
  placa: string
  tiempo_total: string
  horas: number
  minutos: number
  tarifa_por_hora: number
  subtotal: number
  descuento: number
  total: number
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia'
}

const SalidaVehiculos = () => {
  const [vehiculosActivos, setVehiculosActivos] = useState<VehiculoActivo[]>([])
  const [busquedaPlaca, setBusquedaPlaca] = useState('')
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoActivo | null>(null)
  const [datosCobroCalculados, setDatosCobroCalculados] = useState<Cobro | null>(null)
  const [descuentoPersonalizado, setDescuentoPersonalizado] = useState(0)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [procesandoSalida, setProcesandoSalida] = useState(false)
  const [loading, setLoading] = useState(false)

  const { success, error } = useToast()

  // Simular vehículos activos
  useEffect(() => {
    const vehiculosSimulados: VehiculoActivo[] = [
      {
        id: '1',
        placa: 'ABC-1234',
        tipo_vehiculo: 'auto',
        espacio_numero: 15,
        fecha_entrada: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
        tarifa_por_hora: 5000,
        observaciones: 'Vehículo azul'
      },
      {
        id: '2',
        placa: 'DEF-5678',
        tipo_vehiculo: 'moto',
        espacio_numero: 8,
        fecha_entrada: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutos atrás
        tarifa_por_hora: 3000
      },
      {
        id: '3',
        placa: 'GHI-9012',
        tipo_vehiculo: 'auto',
        espacio_numero: 23,
        fecha_entrada: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 horas atrás
        tarifa_por_hora: 5000
      }
    ]
    setVehiculosActivos(vehiculosSimulados)
  }, [])

  const buscarVehiculo = (placa: string) => {
    const vehiculo = vehiculosActivos.find(v => 
      v.placa.toLowerCase().includes(placa.toLowerCase())
    )
    
    if (vehiculo) {
      setVehiculoSeleccionado(vehiculo)
      calcularCobro(vehiculo)
      setBusquedaPlaca('')
    } else {
      error('Vehículo no encontrado', 'No hay un vehículo activo con esa placa')
    }
  }

  const calcularCobro = (vehiculo: VehiculoActivo) => {
    const ahora = new Date()
    const entrada = new Date(vehiculo.fecha_entrada)
    const tiempoTotalMs = ahora.getTime() - entrada.getTime()
    
    // Calcular horas y minutos
    const horas = Math.floor(tiempoTotalMs / (1000 * 60 * 60))
    const minutos = Math.floor((tiempoTotalMs % (1000 * 60 * 60)) / (1000 * 60))
    
    // Redondear hacia arriba si hay minutos adicionales
    const horasACobrar = minutos > 0 ? horas + 1 : horas
    const subtotal = horasACobrar * vehiculo.tarifa_por_hora
    const descuento = (subtotal * descuentoPersonalizado) / 100
    const total = subtotal - descuento

    const tiempoFormateado = `${horas}h ${minutos}m`

    setDatosCobroCalculados({
      placa: vehiculo.placa,
      tiempo_total: tiempoFormateado,
      horas: horasACobrar,
      minutos,
      tarifa_por_hora: vehiculo.tarifa_por_hora,
      subtotal,
      descuento,
      total,
      metodo_pago: metodoPago
    })
  }

  const procesarSalida = async () => {
    if (!vehiculoSeleccionado || !datosCobroCalculados) return

    try {
      setProcesandoSalida(true)
      
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Intentar procesar en la API
      const response = await fetch('/api/vehiculos/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculo_id: vehiculoSeleccionado.id,
          placa: vehiculoSeleccionado.placa,
          espacio_numero: vehiculoSeleccionado.espacio_numero,
          fecha_salida: new Date().toISOString(),
          tiempo_estacionado: datosCobroCalculados.tiempo_total,
          monto_cobrado: datosCobroCalculados.total,
          metodo_pago: metodoPago,
          descuento_aplicado: descuentoPersonalizado
        })
      })

      // Simular éxito siempre
      success(
        'Salida procesada exitosamente',
        `Vehículo ${vehiculoSeleccionado.placa} - Total: $${datosCobroCalculados.total.toLocaleString()}`
      )

      // Remover vehículo de la lista activos
      setVehiculosActivos(prev => prev.filter(v => v.id !== vehiculoSeleccionado.id))
      
      // Limpiar selección
      setVehiculoSeleccionado(null)
      setDatosCobroCalculados(null)
      setDescuentoPersonalizado(0)

    } catch (err) {
      console.error('Error procesando salida:', err)
      error('Error procesando salida', 'Intenta nuevamente')
    } finally {
      setProcesandoSalida(false)
    }
  }

  const vehiculosFiltrados = vehiculosActivos.filter(v => 
    v.placa.toLowerCase().includes(busquedaPlaca.toLowerCase())
  )

  const calcularTiempoEstacionado = (fechaEntrada: string) => {
    const ahora = new Date()
    const entrada = new Date(fechaEntrada)
    const tiempoMs = ahora.getTime() - entrada.getTime()
    const horas = Math.floor(tiempoMs / (1000 * 60 * 60))
    const minutos = Math.floor((tiempoMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Salida de Vehículos</h1>
            <p className="text-lg text-gray-600 mt-1">Procesa salidas y calcula cobros automáticamente</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{vehiculosActivos.length}</div>
              <div className="text-sm text-gray-500">Vehículos activos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Panel de Búsqueda y Listado */}
        <div className="space-y-6">
          {/* Búsqueda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ingresa la placa del vehículo..."
                  value={busquedaPlaca}
                  onChange={(e) => setBusquedaPlaca(e.target.value.toUpperCase())}
                  className="text-lg font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && busquedaPlaca) {
                      buscarVehiculo(busquedaPlaca)
                    }
                  }}
                />
                <Button 
                  onClick={() => buscarVehiculo(busquedaPlaca)}
                  disabled={!busquedaPlaca}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  Escanear QR
                </Button>
                <Button variant="outline" size="sm">
                  <Receipt className="h-4 w-4 mr-2" />
                  Por Ticket
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Vehículos Activos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehículos Activos
                <Badge variant="secondary" className="ml-2">
                  {vehiculosActivos.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vehiculosFiltrados.map((vehiculo) => (
                  <div
                    key={vehiculo.id}
                    onClick={() => {
                      setVehiculoSeleccionado(vehiculo)
                      calcularCobro(vehiculo)
                    }}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${vehiculoSeleccionado?.id === vehiculo.id 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {vehiculo.tipo_vehiculo === 'auto' ? (
                          <Car className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Bike className="h-5 w-5 text-gray-600" />
                        )}
                        <div>
                          <div className="font-semibold text-lg">{vehiculo.placa}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            Espacio {vehiculo.espacio_numero}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {calcularTiempoEstacionado(vehiculo.fecha_entrada)}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(vehiculo.fecha_entrada).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {vehiculo.observaciones && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        {vehiculo.observaciones}
                      </div>
                    )}
                  </div>
                ))}

                {vehiculosFiltrados.length === 0 && (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {busquedaPlaca ? 'No se encontraron vehículos' : 'No hay vehículos activos'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Cobro */}
        <div className="space-y-6">
          {vehiculoSeleccionado && datosCobroCalculados ? (
            <>
              {/* Información del Vehículo */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    {vehiculoSeleccionado.tipo_vehiculo === 'auto' ? (
                      <Car className="h-5 w-5" />
                    ) : (
                      <Bike className="h-5 w-5" />
                    )}
                    Vehículo Seleccionado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-blue-700">Placa</Label>
                      <div className="text-2xl font-bold text-blue-900">
                        {vehiculoSeleccionado.placa}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-blue-700">Espacio</Label>
                      <div className="text-2xl font-bold text-blue-900">
                        #{vehiculoSeleccionado.espacio_numero}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Hora de Entrada</Label>
                    <div className="text-lg font-semibold text-blue-900">
                      {new Date(vehiculoSeleccionado.fecha_entrada).toLocaleString('es-ES')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cálculo de Cobro */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Cálculo de Cobro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tiempo Total</Label>
                      <div className="text-2xl font-bold text-green-600">
                        {datosCobroCalculados.tiempo_total}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Horas a Cobrar</Label>
                      <div className="text-2xl font-bold">
                        {datosCobroCalculados.horas}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span>Tarifa por hora:</span>
                      <span className="font-semibold">
                        ${datosCobroCalculados.tarifa_por_hora.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal ({datosCobroCalculados.horas} horas):</span>
                      <span className="font-semibold">
                        ${datosCobroCalculados.subtotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Descuento */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Descuento (%)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={descuentoPersonalizado}
                          onChange={(e) => {
                            const descuento = Math.max(0, Math.min(100, Number(e.target.value)))
                            setDescuentoPersonalizado(descuento)
                            if (vehiculoSeleccionado) calcularCobro(vehiculoSeleccionado)
                          }}
                          min="0"
                          max="100"
                          className="w-20"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => {
                            setDescuentoPersonalizado(10)
                            if (vehiculoSeleccionado) calcularCobro(vehiculoSeleccionado)
                          }}>10%</Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setDescuentoPersonalizado(20)
                            if (vehiculoSeleccionado) calcularCobro(vehiculoSeleccionado)
                          }}>20%</Button>
                        </div>
                      </div>
                    </div>

                    {datosCobroCalculados.descuento > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Descuento ({descuentoPersonalizado}%):</span>
                        <span className="font-semibold">
                          -${datosCobroCalculados.descuento.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-xl font-bold border-t pt-3">
                      <span>Total a Pagar:</span>
                      <span className="text-green-600">
                        ${datosCobroCalculados.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Método de Pago */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={metodoPago} onValueChange={(value: 'efectivo' | 'tarjeta' | 'transferencia') => {
                    setMetodoPago(value)
                    if (vehiculoSeleccionado) calcularCobro(vehiculoSeleccionado)
                  }}>
                    <SelectTrigger className="text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Efectivo
                        </div>
                      </SelectItem>
                      <SelectItem value="tarjeta">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Tarjeta
                        </div>
                      </SelectItem>
                      <SelectItem value="transferencia">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Transferencia
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Botón de Procesamiento */}
              <Button
                onClick={procesarSalida}
                disabled={procesandoSalida}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {procesandoSalida ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Procesando salida...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogOut className="h-5 w-5" />
                    Procesar Salida - ${datosCobroCalculados.total.toLocaleString()}
                  </div>
                )}
              </Button>
            </>
          ) : (
            <Card className="border-gray-200">
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Receipt className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Selecciona un Vehículo
                </h3>
                <p className="text-gray-500 text-center">
                  Busca o selecciona un vehículo de la lista para calcular el cobro y procesar la salida
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalidaVehiculos