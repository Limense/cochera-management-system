'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Car,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReporteData = any

const COLORES_GRAFICOS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

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
        throw new Error('Error generando reporte')
      }
      
      const data = await response.json()
      setReporteActual(data)
    } catch (error) {
      console.error('Error:', error)
      alert('Error generando reporte')
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

  const renderGraficoIngresos = () => {
    if (!reporteActual?.data || !reporteActual?.resumen) return null

    return (
      <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={reporteActual.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Ingresos']} />
                <Area type="monotone" dataKey="ingresos" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {reporteActual.resumen.por_tipo_vehiculo && (
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Tipo de Vehículo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(reporteActual.resumen.por_tipo_vehiculo).map(([tipo, datos]) => ({
                      name: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      value: (datos as any).ingresos,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      sesiones: (datos as any).sesiones
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(reporteActual.resumen.por_tipo_vehiculo).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES_GRAFICOS[index % COLORES_GRAFICOS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Ingresos']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

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