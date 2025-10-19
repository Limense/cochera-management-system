'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useControlCaja } from '@/lib/hooks/useControlCaja'
import { useAuth } from '@/lib/hooks/useAuth'
import { AperturaCajaModal } from '@/components/modals/AperturaCajaModal'
import { CierreCajaModal } from '@/components/modals/CierreCajaModal'
import {
  Wallet,
  Clock,
  DollarSign,
  Calculator,
  Lock,
  Unlock,
  AlertCircle,
  TrendingUp
} from 'lucide-react'

export function ControlCajaCard() {
  const { profile } = useAuth()
  const {
    turnoActual,
    hayTurnoAbierto,
    puedeAbrirCaja,
    puedeCerrarCaja,
    ventasHoy,
    dineroEsperado,
    loadingTurno
  } = useControlCaja()

  const [aperturaModalOpen, setAperturaModalOpen] = useState(false)
  const [cierreModalOpen, setCierreModalOpen] = useState(false)

  if (loadingTurno) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Control de Caja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado del turno */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hayTurnoAbierto ? (
                <>
                  <Unlock className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Turno Abierto</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Activo
                  </Badge>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Sin Turno</span>
                  <Badge variant="secondary">Cerrado</Badge>
                </>
              )}
            </div>
          </div>

          {/* Información del turno actual */}
          {hayTurnoAbierto && turnoActual && (
            <div className="space-y-3">
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Apertura:</span>
                  </div>
                  <div className="font-medium">
                    {new Date(turnoActual.hora_apertura).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    <span>Inicial:</span>
                  </div>
                  <div className="font-bold text-green-600">
                    S/. {turnoActual.dinero_inicial.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Resumen de ventas del día */}
              {ventasHoy && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1 text-blue-700 text-sm font-medium">
                    <TrendingUp className="w-3 h-3" />
                    Ventas del Día
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-blue-600">Vehículos:</div>
                      <div className="font-bold">{ventasHoy.cantidad_vehiculos}</div>
                    </div>
                    <div>
                      <div className="text-blue-600">Ingresos:</div>
                      <div className="font-bold">S/. {ventasHoy.total_ventas.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-blue-200">
                    <div className="flex items-center gap-1 text-blue-600 text-xs">
                      <Calculator className="w-3 h-3" />
                      Dinero Esperado:
                    </div>
                    <div className="font-bold text-blue-800">
                      S/. {dineroEsperado.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje informativo cuando no hay turno */}
          {!hayTurnoAbierto && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Sin turno activo</p>
                  <p className="text-amber-700">
                    Abre caja para comenzar a trabajar
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            {!hayTurnoAbierto ? (
              <Button
                onClick={() => setAperturaModalOpen(true)}
                disabled={!puedeAbrirCaja}
                className="flex-1"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Abrir Caja
              </Button>
            ) : (
              <Button
                onClick={() => setCierreModalOpen(true)}
                disabled={!puedeCerrarCaja}
                variant="destructive"
                className="flex-1"
              >
                <Lock className="w-4 h-4 mr-2" />
                Cerrar Caja
              </Button>
            )}
          </div>

          {/* Información del empleado */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            {profile?.full_name} • {profile?.role === 'admin' ? 'Administrador' : 'Supervisor'}
          </div>
        </CardContent>
      </Card>

      {/* Modales */}
      <AperturaCajaModal 
        open={aperturaModalOpen} 
        onOpenChange={setAperturaModalOpen} 
      />
      
      <CierreCajaModal 
        open={cierreModalOpen} 
        onOpenChange={setCierreModalOpen} 
      />
    </>
  )
}