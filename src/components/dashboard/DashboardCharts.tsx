'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig
} from '@/components/ui/chart'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis,
  CartesianGrid
} from 'recharts'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'

// Configuración de colores para los charts
const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "hsl(var(--chart-1))",
  },
  vehiculos: {
    label: "Vehículos",
    color: "hsl(var(--chart-2))",
  },
  autos: {
    label: "Autos",
    color: "hsl(var(--chart-3))",
  },
  motos: {
    label: "Motos", 
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

export function DashboardCharts() {
  // Query para datos de gráficos
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      // Datos de los últimos 7 días
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      // Obtener sesiones de los últimos 7 días
      const { data: sesiones } = await supabase
        .from('sesiones_parqueo')
        .select('*')
        .gte('created_at', `${last7Days[0]}T00:00:00`)
        .lt('created_at', `${last7Days[6]}T23:59:59`)

      // Procesar datos para gráficos
      const ingresosPorDia = last7Days.map(date => {
        const sesionesDelDia = sesiones?.filter(s => 
          s.created_at.startsWith(date) && s.monto_calculado
        ) || []
        
        const ingresos = sesionesDelDia.reduce((sum, s) => sum + (s.monto_calculado || 0), 0)
        const vehiculos = sesionesDelDia.length
        const autos = sesionesDelDia.filter(s => s.tipo_vehiculo === 'auto').length
        const motos = sesionesDelDia.filter(s => s.tipo_vehiculo === 'moto').length

        return {
          fecha: new Date(date).toLocaleDateString('es-PE', { 
            weekday: 'short', 
            day: 'numeric' 
          }),
          ingresos,
          vehiculos,
          autos,
          motos
        }
      })

      // Datos para gráfico de pie (hoy)
      const hoy = new Date().toISOString().split('T')[0]
      const sesionesHoy = sesiones?.filter(s => s.created_at.startsWith(hoy)) || []
      const autosHoy = sesionesHoy.filter(s => s.tipo_vehiculo === 'auto').length
      const motosHoy = sesionesHoy.filter(s => s.tipo_vehiculo === 'moto').length

      const tiposVehiculo = [
        { name: 'Autos', value: autosHoy, color: '#3b82f6' },
        { name: 'Motos', value: motosHoy, color: '#10b981' }
      ]

      // Datos de ocupación por horas (simulado - se puede mejorar)
      const ocupacionPorHora = Array.from({ length: 24 }, (_, i) => ({
        hora: `${i.toString().padStart(2, '0')}:00`,
        ocupacion: Math.floor(Math.random() * 45) // Simulado
      }))

      return {
        ingresosPorDia,
        tiposVehiculo,
        ocupacionPorHora
      }
    },
    refetchInterval: 60000 // Actualizar cada minuto
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Análisis y Tendencias</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>Últimos 7 días</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ingresos (Area Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal">Ingresos Diarios</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <AreaChart
                accessibilityLayer
                data={chartData?.ingresosPorDia || []}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <defs>
                  <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-ingresos)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-ingresos)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="ingresos"
                  type="natural"
                  fill="url(#fillIngresos)"
                  fillOpacity={0.4}
                  stroke="var(--color-ingresos)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Vehículos (Bar Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal">Vehículos por Día</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart
                accessibilityLayer
                data={chartData?.ingresosPorDia || []}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="vehiculos" fill="var(--color-vehiculos)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Tipos de Vehículos (Pie Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal">Tipos de Vehículo Hoy</CardTitle>
            <PieChartIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData?.tiposVehiculo || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {chartData?.tiposVehiculo?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Ocupación por Hora (Line Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal">Ocupación por Hora</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <LineChart
                accessibilityLayer
                data={chartData?.ocupacionPorHora || []}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="hora"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={2}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Line
                  dataKey="ocupacion"
                  type="monotone"
                  stroke="var(--color-vehiculos)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}