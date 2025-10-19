'use client'

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

// Colores profesionales para los gráficos
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981', 
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  gray: '#6b7280'
}

// Formatear moneda peruana
const formatCurrency = (value: number) => {
  return `S/ ${value.toFixed(2)}`
}

// Tooltip personalizado para gráficos
const CustomTooltip = ({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number
    color: string
  }>
  label?: string
  formatter?: (value: number) => string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.dataKey}:</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Gráfico de área para ingresos
export function IngresosAreaChart({ 
  data, 
  height = 300 
}: { 
  data: Array<{
    fecha: string
    ingresos: number
  }>
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ingresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="fecha" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={formatCurrency}
        />
        <Tooltip 
          content={<CustomTooltip formatter={formatCurrency} />}
        />
        <Area 
          type="monotone" 
          dataKey="ingresos" 
          stroke={COLORS.primary}
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#ingresos)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Gráfico de barras para vehículos por día
export function VehiculosBarChart({ 
  data,
  height = 300 
}: { 
  data: Array<{
    fecha: string
    autos: number
    motos: number
    vehiculos: number
  }>
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="fecha" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="autos" fill={COLORS.primary} radius={[2, 2, 0, 0]} />
        <Bar dataKey="motos" fill={COLORS.secondary} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Gráfico de pie para distribución de vehículos
export function DistribucionPieChart({ 
  data,
  height = 300 
}: { 
  data: Array<{
    tipo: string
    cantidad: number
    porcentaje: number
    color: string
  }>
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="cantidad"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{data.tipo}</p>
                  <p className="text-sm text-gray-600">
                    Cantidad: <span className="font-semibold">{data.cantidad}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Porcentaje: <span className="font-semibold">{data.porcentaje.toFixed(1)}%</span>
                  </p>
                </div>
              )
            }
            return null
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Gráfico de línea para tendencias
export function TendenciasLineChart({ 
  data,
  height = 300 
}: { 
  data: Array<{
    fecha: string
    ingresos: number
    vehiculos: number
  }>
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="fecha" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis 
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={formatCurrency}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <Tooltip />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="ingresos" 
          stroke={COLORS.primary}
          strokeWidth={3}
          dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="vehiculos" 
          stroke={COLORS.secondary}
          strokeWidth={3}
          dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: COLORS.secondary, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}