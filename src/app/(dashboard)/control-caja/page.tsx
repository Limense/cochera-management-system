'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useControlCaja } from '@/lib/hooks/useControlCaja'
import { AperturaCajaModal } from '@/components/modals/AperturaCajaModal'
import { CierreCajaModal } from '@/components/modals/CierreCajaModal'
import { 
  Wallet,
  Calculator,
  Lock,
  Unlock,
  Receipt,
  TrendingUp,
  DollarSign,
  Clock,
  History
} from 'lucide-react'

interface TurnoHistorial {
  id: string
  fecha: string
  dinero_inicial: number
  dinero_final: number | null
  diferencia: number | null
  estado_turno: 'abierto' | 'cerrado'
  profiles?: {
    full_name: string
  }
}

export default function ControlCajaPage() {
  const [mostrarApertura, setMostrarApertura] = useState(false)
  const [mostrarCierre, setMostrarCierre] = useState(false)

  const {
    turnoActual,
    hayTurnoAbierto,
    ventasHoy,
    historialTurnos,
    loadingTurno,
    loadingHistorial
  } = useControlCaja()

  // Función para formatear moneda
  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(monto)
  }

  // Función para calcular duración del turno
  const calcularDuracionTurno = (turno: { hora_apertura: string; hora_cierre?: string | null }) => {
    if (!turno.hora_apertura) return '0h 0m'
    const inicio = new Date(turno.hora_apertura)
    const fin = turno.hora_cierre ? new Date(turno.hora_cierre) : new Date()
    const diffMs = fin.getTime() - inicio.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const ingresosTotales = ventasHoy?.total_ventas || 0
  const cantidadVehiculos = ventasHoy?.cantidad_vehiculos || 0
  const efectivo = ventasHoy?.ventas_por_metodo?.efectivo || 0
  const dineroEsperado = turnoActual 
    ? turnoActual.dinero_inicial + ingresosTotales
    : 0

  if (loadingTurno) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Control de Caja</h1>
              <p className="text-sm text-gray-500">
                Gestión y cuadre de caja diaria
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={hayTurnoAbierto ? "default" : "secondary"} className="text-sm px-3 py-1">
              {hayTurnoAbierto ? (
                <>
                  <Unlock className="w-3 h-3 mr-1" />
                  Caja Abierta
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  Caja Cerrada
                </>
              )}
            </Badge>

            {hayTurnoAbierto ? (
              <Button 
                onClick={() => setMostrarCierre(true)}
                variant="destructive"
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja
              </Button>
            ) : (
              <Button 
                onClick={() => setMostrarApertura(true)}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Unlock className="w-4 h-4" />
                Abrir Caja
              </Button>
            )}
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Dinero Inicial</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatearMoneda(turnoActual?.dinero_inicial || 0)}
                  </p>
                </div>
                <Wallet className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Ingresos del Día</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatearMoneda(ingresosTotales)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">{cantidadVehiculos} vehículos</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Efectivo</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {formatearMoneda(efectivo)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Dinero Esperado</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatearMoneda(dineroEsperado)}
                  </p>
                </div>
                <Calculator className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información del turno actual */}
        {hayTurnoAbierto && turnoActual && (
          <Card className="border-2 border-blue-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Turno Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Hora de Apertura</p>
                <p className="text-lg font-semibold">
                  {new Date(turnoActual.hora_apertura).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duración del Turno</p>
                <p className="text-lg font-semibold">
                  {calcularDuracionTurno(turnoActual)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="text-lg font-semibold">
                  {new Date(turnoActual.fecha).toLocaleDateString('es-ES')}
                </p>
              </div>
              {turnoActual.observaciones && (
                <div className="md:col-span-3">
                  <p className="text-sm text-gray-600">Observaciones de Apertura</p>
                  <p className="text-sm bg-gray-50 p-3 rounded mt-1">
                    {turnoActual.observaciones}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Desglose de pagos */}
        {hayTurnoAbierto && ventasHoy && ventasHoy.ventas_por_metodo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Desglose por Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(ventasHoy.ventas_por_metodo).map(([metodo, monto]) => (
                  <div key={metodo} className="border rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 capitalize mb-1">{metodo}</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatearMoneda(monto as number)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de turnos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Turnos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistorial ? (
              <p className="text-center text-gray-500 py-4">Cargando historial...</p>
            ) : !historialTurnos || historialTurnos.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No hay turnos registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Fecha</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Empleado</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Dinero Inicial</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Dinero Final</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Diferencia</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialTurnos.slice(0, 10).map((turno: TurnoHistorial) => (
                      <tr key={turno.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">
                          {new Date(turno.fecha).toLocaleDateString('es-ES')}
                        </td>
                        <td className="p-3 text-sm">
                          {turno.profiles?.full_name || 'N/A'}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {formatearMoneda(turno.dinero_inicial)}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {turno.dinero_final ? formatearMoneda(turno.dinero_final) : '-'}
                        </td>
                        <td className={`p-3 text-sm text-right font-semibold ${
                          turno.diferencia && turno.diferencia > 0 ? 'text-green-600' : 
                          turno.diferencia && turno.diferencia < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {turno.diferencia !== null ? formatearMoneda(turno.diferencia) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={turno.estado_turno === 'abierto' ? 'default' : 'secondary'}>
                            {turno.estado_turno === 'abierto' ? 'Abierto' : 'Cerrado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <AperturaCajaModal 
        open={mostrarApertura}
        onOpenChange={setMostrarApertura}
      />
      <CierreCajaModal 
        open={mostrarCierre}
        onOpenChange={setMostrarCierre}
      />
    </>
  )
}