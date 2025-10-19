'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet,
  Calculator,
  FileText,
  Lock,
  Unlock,
  Plus,
  Receipt,
} from 'lucide-react'

export default function ControlCajaPage() {
  // Query para obtener el estado actual de la caja
  const { data: estadoCaja, isLoading } = useQuery({
    queryKey: ['estado-caja'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_caja')
        .select('*')
        .eq('fecha', new Date().toISOString().split('T')[0])
        .eq('estado_turno', 'abierto')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || {
        fecha: new Date().toISOString().split('T')[0],
        dinero_inicial: 0,
        dinero_final: 0,
        dinero_esperado: 0,
        estado_turno: 'cerrado'
      }
    },
    refetchInterval: 30000
  })

  // Query para ingresos del día desde sesiones_parqueo
  const { data: ingresosDia = [] } = useQuery({
    queryKey: ['ingresos-dia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sesiones_parqueo')
        .select('monto_calculado, metodo_pago, created_at')
        .gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00`)
        .lt('created_at', `${new Date().toISOString().split('T')[0]}T23:59:59`)
        .not('monto_calculado', 'is', null)

      if (error) throw error
      return data || []
    },
    refetchInterval: 30000
  })

  if (isLoading) {
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

  const cajaAbierta = estadoCaja?.estado_turno === 'abierto'

  // Calcular ingresos del día desde sesiones
  const totalIngresos = ingresosDia.reduce((sum, ingreso) => sum + (ingreso.monto_calculado || 0), 0)
  const totalEfectivo = ingresosDia.filter(i => i.metodo_pago === 'efectivo').reduce((sum, i) => sum + (i.monto_calculado || 0), 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wallet className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control de Caja</h1>
            <p className="text-sm text-gray-500">
              Gestión de caja diaria
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant={cajaAbierta ? "default" : "secondary"} className="text-sm">
            {cajaAbierta ? (
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
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dinero Inicial</p>
                <p className="text-2xl font-bold text-blue-600">
                  S/ {estadoCaja?.dinero_inicial?.toFixed(2) || '0.00'}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos Total</p>
                <p className="text-2xl font-bold text-green-600">
                  S/ {totalIngresos.toFixed(2)}
                </p>
              </div>
              <Plus className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efectivo</p>
                <p className="text-2xl font-bold text-yellow-600">
                  S/ {totalEfectivo.toFixed(2)}
                </p>
              </div>
              <Calculator className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dinero Final</p>
                <p className="text-2xl font-bold text-purple-600">
                  S/ {estadoCaja?.dinero_final?.toFixed(2) || '0.00'}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de ingresos del día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="w-5 h-5" />
            <span>Ingresos del Día</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ingresosDia.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay ingresos registrados hoy</p>
            ) : (
              ingresosDia.slice(0, 10).map((ingreso, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Pago de parqueo</p>
                      <p className="text-sm text-gray-500">
                        {new Date(ingreso.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+ S/ {ingreso.monto_calculado?.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 capitalize">{ingreso.metodo_pago}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}