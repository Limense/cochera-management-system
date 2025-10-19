'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuditoria } from '@/lib/hooks/useAuditoria'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Shield,
  Clock,
  DollarSign,
  User,
  AlertCircle,
  Activity
} from 'lucide-react'

export function AuditoriaPanel() {
  const { profile } = useAuth()
  const {
    logs,
    isLoading,
    error,
    getActionDescription,
    formatTimestamp,
    canViewLogs
  } = useAuditoria()

  // Solo mostrar para admins
  if (!canViewLogs || profile?.role !== 'admin') {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Registro de Actividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Registro de Actividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Error al cargar los logs de auditoría</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Registro de Actividades
          <Badge variant="secondary" className="ml-auto">
            {logs.length} registros
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay actividades registradas</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {/* Icono según tipo de acción */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(log.accion_tipo)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {log.profiles?.full_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {getActionDescription(log.accion_tipo)}
                        </p>
                        
                        {/* Detalles adicionales */}
                        {log.detalles && Object.keys(log.detalles).length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {Object.entries(log.detalles).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Monto si existe */}
                      {log.monto && (
                        <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-sm font-medium">
                            S/. {log.monto.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// Función para obtener el icono según el tipo de acción
function getActionIcon(actionType: string) {
  const iconClass = "w-4 h-4"
  
  switch (actionType) {
    case 'entrada_vehiculo':
      return <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
        <Activity className={`${iconClass} text-green-600`} />
      </div>
    case 'salida_vehiculo':
      return <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
        <Activity className={`${iconClass} text-red-600`} />
      </div>
    case 'caja_abierta':
      return <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
        <DollarSign className={`${iconClass} text-blue-600`} />
      </div>
    case 'caja_cerrada':
      return <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
        <DollarSign className={`${iconClass} text-purple-600`} />
      </div>
    case 'login':
    case 'logout':
      return <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
        <User className={`${iconClass} text-gray-600`} />
      </div>
    case 'usuario_creado':
    case 'usuario_actualizado':
      return <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
        <User className={`${iconClass} text-amber-600`} />
      </div>
    default:
      return <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
        <Shield className={`${iconClass} text-gray-600`} />
      </div>
  }
}