'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useControlCaja } from '@/lib/hooks/useControlCaja'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  Wallet, 
  Clock, 
  Calculator, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle2
} from 'lucide-react'

// Validación Zod siguiendo convención híbrida
const cierreSchema = z.object({
  dinero_final: z
    .number({ message: 'El dinero final es requerido' })
    .min(0, 'El dinero final no puede ser negativo')
    .max(50000, 'El dinero final no puede exceder S/. 50,000'),
  observaciones: z
    .string()
    .max(500, 'Las observaciones no pueden exceder 500 caracteres')
    .optional()
})

type CierreFormData = z.infer<typeof cierreSchema>

interface CierreCajaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CierreCajaModal({ open, onOpenChange }: CierreCajaModalProps) {
  const { profile } = useAuth()
  const {
    turnoActual,
    hayTurnoAbierto,
    puedeCerrarCaja,
    cerrarCaja,
    isClosingCaja,
    ventasHoy,
    dineroEsperado
  } = useControlCaja()

  const form = useForm<CierreFormData>({
    resolver: zodResolver(cierreSchema),
    defaultValues: {
      dinero_final: dineroEsperado,
      observaciones: ''
    }
  })

  // Actualizar dinero final sugerido cuando cambie el dinero esperado
  const dineroFinalForm = form.watch('dinero_final')
  const diferencia = dineroFinalForm ? dineroFinalForm - dineroEsperado : 0

  const onSubmit = async (data: CierreFormData) => {
    try {
      await cerrarCaja.mutateAsync(data)
      form.reset()
      onOpenChange(false)
    } catch {
      // Error ya manejado por el hook
    }
  }

  // Si no hay turno abierto, mostrar mensaje
  if (!hayTurnoAbierto || !turnoActual) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              No Hay Turno Abierto
            </DialogTitle>
            <DialogDescription>
              No tienes ningún turno abierto para cerrar. Primero debes abrir caja.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Calcular duración del turno
  const duracionTurno = turnoActual.hora_apertura 
    ? Math.floor((new Date().getTime() - new Date(turnoActual.hora_apertura).getTime()) / (1000 * 60 * 60))
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-500" />
            Cerrar Caja - Fin de Turno
          </DialogTitle>
          <DialogDescription>
            Registra el dinero final contado para cerrar tu turno de trabajo.
          </DialogDescription>
        </DialogHeader>

        {/* Información del turno actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Info del empleado y turno */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información del Turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Empleado:</span>
                <div className="text-right">
                  <div className="font-medium">{profile?.full_name}</div>
                  <Badge variant="secondary" className="text-xs">
                    {profile?.role === 'admin' ? 'Admin' : 'Supervisor'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">
                  {new Date(turnoActual.fecha).toLocaleDateString('es-PE')}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Apertura:</span>
                <span className="font-medium">
                  {new Date(turnoActual.hora_apertura).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duración:</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duracionTurno}h {Math.floor(((new Date().getTime() - new Date(turnoActual.hora_apertura).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}min
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de ventas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ventas del Día</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vehículos atendidos:</span>
                <span className="font-bold">{ventasHoy?.cantidad_vehiculos || 0}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total en ventas:</span>
                <span className="font-bold text-green-600">
                  S/. {(ventasHoy?.total_ventas || 0).toFixed(2)}
                </span>
              </div>
              
              <Separator />
              
              {/* Desglose por método de pago */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Por método de pago:</div>
                {ventasHoy?.ventas_por_metodo && Object.entries(ventasHoy.ventas_por_metodo).map(([metodo, monto]) => (
                  <div key={metodo} className="flex justify-between text-xs">
                    <span className="capitalize">{metodo}:</span>
                    <span>S/. {monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cálculos de caja */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Cálculo de Caja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground">Dinero Inicial</div>
                <div className="font-bold text-lg">S/. {turnoActual.dinero_inicial.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">+ Ventas del Día</div>
                <div className="font-bold text-lg text-green-600">
                  S/. {(ventasHoy?.total_ventas || 0).toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">= Dinero Esperado</div>
                <div className="font-bold text-xl text-blue-600">
                  S/. {dineroEsperado.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dinero_final"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dinero Final Contado</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        S/.
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={dineroEsperado.toFixed(2)}
                        className="pl-8 text-lg font-bold"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mostrar diferencia */}
            {Math.abs(diferencia) > 0.01 && (
              <Card className={diferencia > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {diferencia > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : diferencia < 0 ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <Minus className="w-5 h-5 text-gray-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {diferencia > 0 ? 'Sobrante' : diferencia < 0 ? 'Faltante' : 'Caja Cuadrada'}
                      </div>
                      <div className={`text-lg font-bold ${diferencia > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        S/. {Math.abs(diferencia).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Caja cuadrada */}
            {Math.abs(diferencia) <= 0.01 && dineroFinalForm > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                      <div className="font-medium">¡Caja Cuadrada Perfectamente!</div>
                      <div className="text-sm">El dinero contado coincide con lo esperado</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones del Cierre (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre el cierre, incidencias, faltantes, sobrantes, etc."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alerta importante */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Antes de cerrar:</p>
                  <ul className="mt-1 text-amber-700 space-y-1">
                    <li>• Cuenta todo el dinero físico en caja</li>
                    <li>• Verifica que no haya vehículos pendientes de salida</li>
                    <li>• Una vez cerrado, no podrás modificar el registro</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isClosingCaja}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!puedeCerrarCaja || isClosingCaja}
                variant="destructive"
              >
                {isClosingCaja ? 'Cerrando...' : 'Cerrar Caja'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}