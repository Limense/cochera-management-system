'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  Clock, 
  Car, 
  Bike, 
  Calendar,
  DollarSign,
  Info
} from 'lucide-react'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { simularPricingDinamico, type CalculoPricingDetallado } from '@/lib/pricing/calculator'
import { formatCurrency } from '@/lib/utils'
import { TipoVehiculo } from '@/types/database'

interface SimuladorCostosProps {
  className?: string
}

export function SimuladorCostos({ className }: SimuladorCostosProps) {
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>('auto')
  const [duracionHoras, setDuracionHoras] = useState<number>(1)
  const [duracionMinutos, setDuracionMinutos] = useState<number>(0)
  const [fechaHora, setFechaHora] = useState<string>(
    new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
  )
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<CalculoPricingDetallado | null>(null)
  const [error, setError] = useState<string | null>(null)

  const simular = async () => {
    try {
      setCalculando(true)
      setError(null)
      
      const totalMinutos = (duracionHoras * 60) + duracionMinutos
      
      if (totalMinutos <= 0) {
        setError('La duración debe ser mayor a 0 minutos')
        return
      }
      
      const fechaReferencia = new Date(fechaHora)
      
      if (isNaN(fechaReferencia.getTime())) {
        setError('Fecha y hora inválidas')
        return
      }
      
      const resultadoSimulacion = await simularPricingDinamico(
        tipoVehiculo,
        totalMinutos,
        fechaReferencia
      )
      
      setResultado(resultadoSimulacion)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al simular')
    } finally {
      setCalculando(false)
    }
  }

  const limpiar = () => {
    setResultado(null)
    setError(null)
    setDuracionHoras(1)
    setDuracionMinutos(0)
    setFechaHora(new Date().toISOString().slice(0, 16))
  }

  const formatearFechaHora = (fecha: Date) => {
    return fecha.toLocaleString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Simulador de Costos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Calcula el costo de estacionamiento con tarifas dinámicas según horarios y días
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Configuración de simulación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de vehículo */}
            <div className="space-y-2">
              <Label>Tipo de Vehículo</Label>
              <Select 
                value={tipoVehiculo} 
                onValueChange={(value) => setTipoVehiculo(value as TipoVehiculo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Auto
                    </div>
                  </SelectItem>
                  <SelectItem value="moto">
                    <div className="flex items-center gap-2">
                      <Bike className="w-4 h-4" />
                      Moto
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y hora */}
            <div className="space-y-2">
              <Label>Fecha y Hora de Entrada</Label>
              <Input
                type="datetime-local"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-2">
            <Label>Duración de Estacionamiento</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={duracionHoras}
                  onChange={(e) => setDuracionHoras(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">horas</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={duracionMinutos}
                  onChange={(e) => setDuracionMinutos(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
            </div>
          </div>

          {/* Información contextual */}
          {fechaHora && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Contexto de simulación:</span>
              </div>
              <div className="mt-1 text-sm text-blue-700">
                {formatearFechaHora(new Date(fechaHora))}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              onClick={simular}
              disabled={calculando}
              className="flex-1"
            >
              {calculando ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Simular Costo
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={limpiar}
              disabled={calculando}
            >
              Limpiar
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-red-800 text-sm">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Resultado de la simulación */}
          {resultado && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Resultado de la Simulación</h3>
                
                {/* Monto total */}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-medium">Costo Total</p>
                        <p className="text-xs text-green-600">
                          {tipoVehiculo === 'auto' ? 'Auto' : 'Moto'} • {duracionHoras}h {duracionMinutos}min
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-2xl font-bold text-green-800">
                          <DollarSign className="w-6 h-6" />
                          {formatCurrency(resultado.monto_total)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tarifa aplicada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Tarifa Aplicada</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {resultado.tarifa_aplicada ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{resultado.tarifa_aplicada.nombre}</span>
                            <Badge variant="default">Dinámica</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {resultado.tarifa_aplicada.descripcion}
                          </p>
                          <div className="text-xs space-y-1">
                            <div>Horario: {resultado.tarifa_aplicada.hora_inicio} - {resultado.tarifa_aplicada.hora_fin}</div>
                            <div>Primera hora: {formatCurrency(resultado.tarifa_aplicada.tarifa_primera_hora)}</div>
                            <div>Hora adicional: {formatCurrency(resultado.tarifa_aplicada.tarifa_hora_adicional)}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Tarifa Fija</span>
                            <Badge variant="secondary">Tradicional</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No hay tarifas dinámicas configuradas para este horario
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Desglose del cálculo */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Desglose del Cálculo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Tiempo total:</span>
                          <span>{resultado.desglose.tiempo_total_minutos} min</span>
                        </div>
                        {resultado.desglose.tiempo_gracia_aplicado > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Tiempo de gracia:</span>
                            <span>-{resultado.desglose.tiempo_gracia_aplicado} min</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tiempo facturable:</span>
                          <span>{resultado.desglose.tiempo_facturable_minutos} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Horas completas:</span>
                          <span>{resultado.desglose.horas_completas}</span>
                        </div>
                        {resultado.desglose.minutos_adicionales > 0 && (
                          <div className="flex justify-between">
                            <span>Minutos adicionales:</span>
                            <span>{resultado.desglose.minutos_adicionales}</span>
                          </div>
                        )}
                        {resultado.desglose.redondeo_aplicado && (
                          <div className="flex justify-between text-blue-600">
                            <span>Redondeo aplicado:</span>
                            <span>Sí</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Observaciones */}
                {resultado.observaciones.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Observaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {resultado.observaciones.map((obs, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}