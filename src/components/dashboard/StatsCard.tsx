'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, DollarSign, Car, ParkingCircle } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  colorScheme?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  className?: string
  isLoading?: boolean
}

const colorSchemes = {
  blue: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600'
  },
  green: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600'
  },
  orange: {
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600'
  },
  red: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600'
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600'
  }
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  colorScheme = 'blue',
  className,
  isLoading = false
}: StatsCardProps) {
  const colors = colorSchemes[colorScheme]

  if (isLoading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
              {subtitle && <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />}
            </div>
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center animate-pulse",
              "bg-gray-200"
            )} />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {typeof value === 'number' ? value.toLocaleString('es-PE') : value}
            </p>
            
            {/* Trend indicator */}
            {trend && (
              <div className="flex items-center space-x-1">
                {trend.isPositive ? (
                  <TrendingUp className={cn("h-3 w-3", colors.trendPositive)} />
                ) : (
                  <TrendingDown className={cn("h-3 w-3", colors.trendNegative)} />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? colors.trendPositive : colors.trendNegative
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
                </span>
              </div>
            )}
            
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
            colors.iconBg
          )}>
            <Icon className={cn("w-6 h-6", colors.iconColor)} />
          </div>
        </div>
      </CardContent>
      
      {/* Subtle gradient overlay for visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 pointer-events-none" />
    </Card>
  )
}

// Variantes específicas para casos comunes
export function IngresosCard({ 
  value, 
  trend, 
  isLoading,
  periodo = 'hoy'
}: { 
  value: number
  trend?: StatsCardProps['trend']
  isLoading?: boolean
  periodo?: string
}) {
  return (
    <StatsCard
      title={`Ingresos ${periodo === 'hoy' ? 'del día' : `de la ${periodo}`}`}
      value={`S/ ${value.toFixed(2)}`}
      icon={DollarSign}
      trend={trend}
      colorScheme="green"
      isLoading={isLoading}
    />
  )
}

export function VehiculosCard({ 
  value, 
  trend, 
  isLoading,
  subtitle
}: { 
  value: number
  trend?: StatsCardProps['trend']
  isLoading?: boolean
  subtitle?: string
}) {
  return (
    <StatsCard
      title="Vehículos"
      value={value}
      icon={Car}
      trend={trend}
      subtitle={subtitle}
      colorScheme="blue"
      isLoading={isLoading}
    />
  )
}

export function OcupacionCard({ 
  ocupados, 
  total, 
  isLoading 
}: { 
  ocupados: number
  total: number
  isLoading?: boolean
}) {
  const porcentaje = total > 0 ? (ocupados / total) * 100 : 0
  
  return (
    <StatsCard
      title="Ocupación"
      value={`${ocupados}/${total}`}
      icon={ParkingCircle}
      subtitle={`${porcentaje.toFixed(1)}% ocupado`}
      colorScheme="orange"
      isLoading={isLoading}
    />
  )
}