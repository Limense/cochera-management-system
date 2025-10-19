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
import { useControlCaja } from '@/lib/hooks/useControlCaja'
import { useAuth } from '@/lib/hooks/useAuth'
import { Wallet, Clock, User, AlertCircle, CheckCircle } from 'lucide-react'

// Validación Zod siguiendo convención híbrida
const aperturaSchema = z.object({
  dinero_inicial: z
    .number({ message: 'El dinero inicial es requerido' })
    .min(0, 'El dinero inicial no puede ser negativo')
    .max(10000, 'El dinero inicial no puede exceder S/. 10,000'),
  observaciones: z
    .string()
    .max(500, 'Las observaciones no pueden exceder 500 caracteres')
    .optional()
})

type AperturaFormData = z.infer<typeof aperturaSchema>

interface AperturaCajaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AperturaCajaModal({ open, onOpenChange }: AperturaCajaModalProps) {
  const { profile } = useAuth()
  const {
    turnoActual,
    hayTurnoAbierto,
    puedeAbrirCaja,
    abrirCaja,
    isOpeningCaja
  } = useControlCaja()

  const form = useForm<AperturaFormData>({
    resolver: zodResolver(aperturaSchema),
    defaultValues: {
      dinero_inicial: 50.0, // Valor por defecto común
      observaciones: ''
    }
  })

  const onSubmit = async (data: AperturaFormData) => {
    try {
      await abrirCaja.mutateAsync(data)
      form.reset()
      onOpenChange(false)
    } catch {
      // Error ya manejado por el hook
    }
  }

  // Si ya hay turno abierto, mostrar información
  if (hayTurnoAbierto && turnoActual) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Turno Ya Abierto
            </DialogTitle>
            <DialogDescription>
              Ya tienes un turno activo. Debes cerrarlo antes de abrir uno nuevo.
            </DialogDescription>
          </DialogHeader>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Turno Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="default">
                  {turnoActual.estado_turno === 'abierto' ? 'Abierto' : 'Cerrado'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">
                  {new Date(turnoActual.fecha).toLocaleDateString('es-PE')}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hora de apertura:</span>
                <span className="font-medium">
                  {new Date(turnoActual.hora_apertura).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dinero inicial:</span>
                <span className="font-bold text-green-600">
                  S/. {turnoActual.dinero_inicial.toFixed(2)}
                </span>
              </div>
              
              {turnoActual.observaciones && (
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Observaciones:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs">
                    {turnoActual.observaciones}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Abrir Caja - Nuevo Turno
          </DialogTitle>
          <DialogDescription>
            Inicia un nuevo turno de trabajo registrando el dinero inicial en caja.
          </DialogDescription>
        </DialogHeader>

        {/* Información del empleado */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">{profile?.full_name}</p>
                <p className="text-sm text-blue-700">{profile?.email}</p>
              </div>
              <Badge variant="secondary">
                {profile?.role === 'admin' ? 'Administrador' : 'Supervisor'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Información de fecha y hora */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {new Date().toLocaleDateString('es-PE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} - {new Date().toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dinero_inicial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dinero Inicial en Caja</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        S/.
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10000"
                        placeholder="50.00"
                        className="pl-8"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre el turno, cambios en denominaciones, etc."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Información importante */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Importante:</p>
                  <ul className="mt-1 text-amber-700 space-y-1">
                    <li>• Cuenta el dinero físico antes de registrar</li>
                    <li>• Solo puede haber un turno abierto por empleado</li>
                    <li>• El turno se cerrará automáticamente al final del día</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isOpeningCaja}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!puedeAbrirCaja || isOpeningCaja}
              >
                {isOpeningCaja ? 'Abriendo...' : 'Abrir Caja'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}