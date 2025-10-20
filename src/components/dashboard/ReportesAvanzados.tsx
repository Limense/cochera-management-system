'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Car,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Pie, PieChart } from 'recharts'
import * as RechartsPrimitive from 'recharts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReporteData = any

const ReportesAvanzados = () => {
  const [reporteActual, setReporteActual] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState({
    tipo: 'ingresos',
    fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    granularidad: 'dia',
    incluir_activos: true
  })

  const generarReporte = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...filtros,
        incluir_activos: filtros.incluir_activos.toString()
      })
      
      const response = await fetch(`/api/reportes?${params}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Error generando reporte')
      }
      
      const data = await response.json()
      setReporteActual(data)
    } catch (error) {
      console.error('Error completo:', error)
      alert(`Error generando reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }, [filtros])

  const exportarReporte = async (formato: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        ...filtros,
        formato,
        incluir_activos: filtros.incluir_activos.toString()
      })
      
      const response = await fetch(`/api/reportes?${params}`)
      if (!response.ok) {
        throw new Error('Error exportando reporte')
      }
      
      if (formato === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_${filtros.tipo}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_${filtros.tipo}_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exportando:', error)
      alert('Error exportando reporte')
    }
  }

  // Paleta de colores moderna y accesible
  const chartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#36b37e', // verde
    '#ffab00', // amarillo
    '#ff5630', // rojo
    '#6554c0', // violeta
    '#00b8d9', // cyan
  ];

  const renderGraficoIngresos = () => {
    if (!reporteActual?.data || !reporteActual?.resumen) return null;

    // Datos para gráfico de barras: ingresos por periodo
    type DataBar = { periodo: string; ingresos: number; sesiones: number };
    type DataLine = { periodo: string; activas: number; completadas: number };
    type DataBarTipo = { tipo: string; ingresos: number; color: string };

    interface RawData {
      periodo: string;
      ingresos: number;
      sesiones: number;
      sesiones_activas?: number;
      sesiones_completadas?: number;
    }
    const dataBar: DataBar[] = (reporteActual.data as RawData[]).map((d) => ({
      periodo: d.periodo,
      ingresos: d.ingresos,
      sesiones: d.sesiones,
    }));

    // Datos para gráfico de líneas: sesiones activas vs completadas
    const dataLine: DataLine[] = (reporteActual.data as RawData[]).map((d) => ({
      periodo: d.periodo,
      activas: d.sesiones_activas ?? 0,
      completadas: d.sesiones_completadas ?? d.sesiones ?? 0,
    }));

    // Datos para gráfico de barras: ingresos por tipo de vehículo
    type TipoVehiculoResumen = { ingresos: number };
    const tiposVehiculo: [string, TipoVehiculoResumen][] = reporteActual.resumen.por_tipo_vehiculo
      ? Object.entries(reporteActual.resumen.por_tipo_vehiculo as Record<string, TipoVehiculoResumen>)
      : [];
    const dataBarTipo: DataBarTipo[] = tiposVehiculo.map(([tipo, datos], idx) => ({
      tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
      ingresos: datos.ingresos,
      color: chartColors[idx % chartColors.length],
    }));

    return (
      <div className="space-y-6">
        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(reporteActual.resumen.total_ingresos || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {reporteActual.resumen.total_sesiones || 0} sesiones
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Sesión</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(reporteActual.resumen.promedio_por_sesion || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Por sesión completada
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesiones Activas</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reporteActual.resumen.sesiones_activas || 0}</div>
              <p className="text-xs text-muted-foreground">
                En curso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos en dos columnas para aprovechar el espacio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico de área: ingresos por periodo */}
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Período</CardTitle>
              <CardDescription>Evolución temporal de los ingresos</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  ingresos: {
                    label: 'Ingresos',
                    color: 'hsl(var(--chart-1))',
                  },
                }}
                className="h-[260px]"
              >
                <AreaChart data={dataBar}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))" 
                    fillOpacity={0.5} 
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de barras: ingresos por periodo */}
          <Card>
            <CardHeader>
              <CardTitle>Barras de Ingresos por Período</CardTitle>
              <CardDescription>Comparativo de ingresos por periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  ingresos: {
                    label: 'Ingresos',
                    color: 'hsl(var(--chart-2))',
                  },
                }}
                className="h-[260px]"
              >
                <RechartsPrimitive.BarChart data={dataBar}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <RechartsPrimitive.Bar dataKey="ingresos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </RechartsPrimitive.BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de líneas: sesiones activas vs completadas */}
          <Card>
            <CardHeader>
              <CardTitle>Sesiones Activas vs Completadas</CardTitle>
              <CardDescription>Evolución de sesiones por periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  activas: {
                    label: 'Activas',
                    color: 'hsl(var(--chart-3))',
                  },
                  completadas: {
                    label: 'Completadas',
                    color: 'hsl(var(--chart-4))',
                  },
                }}
                className="h-[220px]"
              >
                <RechartsPrimitive.LineChart data={dataLine}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <RechartsPrimitive.Line type="monotone" dataKey="activas" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  <RechartsPrimitive.Line type="monotone" dataKey="completadas" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </RechartsPrimitive.LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de barras: ingresos por tipo de vehículo */}
          {dataBarTipo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Tipo de Vehículo (Barras)</CardTitle>
                <CardDescription>Comparativo de ingresos por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={dataBarTipo.reduce((acc, curr) => {
                    acc[curr.tipo] = { label: curr.tipo, color: curr.color };
                    return acc;
                  }, {} as Record<string, { label: string; color: string }>)}
                  className="h-[220px]"
                >
                  <RechartsPrimitive.BarChart data={dataBarTipo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <RechartsPrimitive.Bar dataKey="ingresos" radius={[4, 4, 0, 0]}>
                      {dataBarTipo.map((entry, idx) => (
                        <RechartsPrimitive.Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </RechartsPrimitive.Bar>
                  </RechartsPrimitive.BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Gráfico de torta: ingresos por tipo de vehículo */}
          {dataBarTipo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Tipo de Vehículo (Torta)</CardTitle>
                <CardDescription>Distribución de ingresos por categoría</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={dataBarTipo.reduce((acc, curr) => {
                    acc[curr.tipo] = { label: curr.tipo, color: curr.color };
                    return acc;
                  }, {} as Record<string, { label: string; color: string }>)}
                  className="h-[220px]"
                >
                  <PieChart>
                    <Pie
                      data={dataBarTipo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => {
                        let tipo = '';
                        if (entry && typeof entry === 'object' && entry.payload && typeof entry.payload === 'object' && 'tipo' in entry.payload) {
                          tipo = String((entry.payload as { tipo?: string }).tipo ?? '');
                        }
                        const percent = typeof entry.percent === 'number' ? entry.percent : 0;
                        return `${tipo} ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={80}
                      dataKey="ingresos"
                    >
                      {dataBarTipo.map((entry, idx) => (
                        <RechartsPrimitive.Cell key={`cell-pie-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderResumenEjecutivo = () => {
    if (!reporteActual) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumen Ejecutivo
          </CardTitle>
          <CardDescription>
            Reporte generado el {reporteActual.generado_en ? new Date(reporteActual.generado_en).toLocaleDateString() : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Parámetros del Reporte</h4>
              <div className="space-y-1 text-sm">
                <div>Tipo: <Badge variant="outline">{filtros.tipo}</Badge></div>
                <div>Período: {filtros.fecha_inicio} al {filtros.fecha_fin}</div>
                <div>Granularidad: <Badge variant="secondary">{filtros.granularidad}</Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Métricas Principales</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(reporteActual.resumen || {}).slice(0, 5).map(([key, value]) => (
                  <div key={key}>
                    {key.replace(/_/g, ' ')}: <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reportes Avanzados</h1>
          <p className="text-muted-foreground">Análisis detallado y visualización de datos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportarReporte('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => exportarReporte('json')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Panel de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Reporte</Label>
              <Select value={filtros.tipo} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingresos">Ingresos</SelectItem>
                  <SelectItem value="ocupacion">Ocupación</SelectItem>
                  <SelectItem value="vehiculos">Vehículos</SelectItem>
                  <SelectItem value="tiempos">Tiempos</SelectItem>
                  <SelectItem value="frecuentes">Frecuentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin</Label>
              <Input
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_fin: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="granularidad">Granularidad</Label>
              <Select value={filtros.granularidad} onValueChange={(value) => setFiltros(prev => ({ ...prev, granularidad: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Por Día</SelectItem>
                  <SelectItem value="semana">Por Semana</SelectItem>
                  <SelectItem value="mes">Por Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={generarReporte} disabled={loading} className="w-full">
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Generar Reporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido del Reporte */}
      {reporteActual && (
        <Tabs defaultValue="graficos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>
          
          <TabsContent value="graficos" className="space-y-6">
            {filtros.tipo === 'ingresos' && renderGraficoIngresos()}
            {!['ingresos'].includes(filtros.tipo) && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    Visualización disponible próximamente para: {filtros.tipo}
                  </p>
                  <div className="mt-4 text-xs bg-muted p-4 rounded max-h-40 overflow-auto">
                    <pre>{JSON.stringify(reporteActual.data?.slice(0, 3) || [], null, 2)}</pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="resumen" className="space-y-6">
            {renderResumenEjecutivo()}
            
            {reporteActual.data && reporteActual.data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Datos Detallados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-auto">
                    <pre className="text-xs bg-muted p-4 rounded">
                      {JSON.stringify(reporteActual.data.slice(0, 10), null, 2)}
                    </pre>
                  </div>
                  {reporteActual.data.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Mostrando primeros 10 registros de {reporteActual.data.length} total
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default ReportesAvanzados