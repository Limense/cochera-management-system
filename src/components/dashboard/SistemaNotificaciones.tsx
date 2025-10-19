'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/providers/ToastProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  BellRing,
  Check,
  X,
  Trash2,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Archive
} from 'lucide-react'

type Notificacion = {
  id: string
  tipo: 'info' | 'warning' | 'error' | 'success'
  titulo: string
  mensaje: string
  usuario_id?: string
  es_global: boolean
  accion_url?: string
  accion_texto?: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  categoria: 'sistema' | 'backup' | 'vehiculo' | 'pago' | 'usuario' | 'mantenimiento'
  leida: boolean
  archivada: boolean
  created_at: string
  updated_at: string
  expira_en?: string
  metadata?: Record<string, unknown>
}

type Estadisticas = {
  total: number
  no_leidas: number
  por_tipo: {
    info: number
    warning: number
    error: number
    success: number
  }
  por_prioridad: {
    baja: number
    media: number
    alta: number
    critica: number
  }
}

const SistemaNotificaciones = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtros] = useState({
    tipo: '',
    categoria: '',
    prioridad: '',
    solo_no_leidas: false
  })
  const { success, error } = useToast()

  const cargarNotificaciones = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filtros.tipo) params.append('tipo', filtros.tipo)
      if (filtros.categoria) params.append('categoria', filtros.categoria)
      if (filtros.solo_no_leidas) params.append('solo_no_leidas', 'true')
      
      const response = await fetch(`/api/notificaciones?${params}`)
      if (!response.ok) throw new Error('Error cargando notificaciones')
      
      const data = await response.json()
      if (data.success) {
        setNotificaciones(data.data)
        setEstadisticas(data.estadisticas)
      }
    } catch (err) {
      console.error('Error:', err)
      error('Error cargando notificaciones', 'No se pudieron cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }, [filtros, error])

  const marcarComoLeida = async (id: string, leida: boolean = true) => {
    try {
      const response = await fetch(`/api/notificaciones?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leida })
      })
      
      if (response.ok) {
        success(leida ? 'Notificación marcada como leída' : 'Notificación marcada como no leída')
        await cargarNotificaciones()
      }
    } catch (err) {
      console.error('Error:', err)
      error('Error actualizando notificación')
    }
  }

  const eliminarNotificacion = async (id: string) => {
    try {
      const response = await fetch(`/api/notificaciones?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await cargarNotificaciones()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const limpiarLeidas = async () => {
    try {
      const response = await fetch(`/api/notificaciones?accion=limpiar_leidas`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await cargarNotificaciones()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const crearNotificacionPrueba = async () => {
    try {
      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'info',
          titulo: 'Notificación de prueba',
          mensaje: 'Esta es una notificación de prueba creada desde la interfaz',
          es_global: true,
          categoria: 'sistema',
          prioridad: 'media'
        })
      })
      
      if (response.ok) {
        success('Notificación de prueba creada', 'Se ha creado una nueva notificación de prueba')
        await cargarNotificaciones()
      }
    } catch (err) {
      console.error('Error:', err)
      error('Error creando notificación de prueba')
    }
  }

  useEffect(() => {
    cargarNotificaciones()
  }, [cargarNotificaciones])

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'info': return <Info className="h-4 w-4" />
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'info': return 'text-blue-500'
      case 'success': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'bg-gray-100 text-gray-800'
      case 'media': return 'bg-blue-100 text-blue-800'
      case 'alta': return 'bg-orange-100 text-orange-800'
      case 'critica': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centro de Notificaciones</h2>
          <p className="text-muted-foreground">
            Gestiona alertas y notificaciones del sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={crearNotificacionPrueba}
            variant="outline"
            size="sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            Prueba
          </Button>
          <Button 
            onClick={cargarNotificaciones}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Leídas</CardTitle>
              <BellRing className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estadisticas.no_leidas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estadisticas.por_prioridad.critica}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errores</CardTitle>
              <X className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estadisticas.por_tipo.error}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="todas" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="no-leidas">No Leídas</TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button
              onClick={limpiarLeidas}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Leídas
            </Button>
          </div>
        </div>

        <TabsContent value="todas" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : notificaciones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No hay notificaciones</p>
                <p className="text-sm text-muted-foreground">Las notificaciones aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notificaciones.map((notificacion) => (
                <Card 
                  key={notificacion.id} 
                  className={`${!notificacion.leida ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div className={`mt-1 ${getColorTipo(notificacion.tipo)}`}>
                          {getIconoTipo(notificacion.tipo)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{notificacion.titulo}</h4>
                            <Badge variant="secondary" className={getColorPrioridad(notificacion.prioridad)}>
                              {notificacion.prioridad}
                            </Badge>
                            <Badge variant="outline">{notificacion.categoria}</Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {notificacion.mensaje}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatearFecha(notificacion.created_at)}
                            </div>
                            {notificacion.es_global && (
                              <Badge variant="outline" className="text-xs">Global</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => marcarComoLeida(notificacion.id, !notificacion.leida)}
                        >
                          {notificacion.leida ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => eliminarNotificacion(notificacion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="no-leidas" className="space-y-4">
          <div className="space-y-3">
            {notificaciones.filter(n => !n.leida).map((notificacion) => (
              <Card 
                key={notificacion.id} 
                className="border-l-4 border-l-blue-500 bg-blue-50/30"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 flex-1">
                      <div className={`mt-1 ${getColorTipo(notificacion.tipo)}`}>
                        {getIconoTipo(notificacion.tipo)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{notificacion.titulo}</h4>
                          <Badge variant="secondary" className={getColorPrioridad(notificacion.prioridad)}>
                            {notificacion.prioridad}
                          </Badge>
                          <Badge variant="outline">{notificacion.categoria}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {notificacion.mensaje}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatearFecha(notificacion.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => marcarComoLeida(notificacion.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="sistema">
          <div className="space-y-3">
            {notificaciones.filter(n => n.categoria === 'sistema').map((notificacion) => (
              <Card key={notificacion.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Settings className="h-5 w-5 text-gray-500 mt-1" />
                      <div>
                        <h4 className="font-semibold">{notificacion.titulo}</h4>
                        <p className="text-sm text-muted-foreground">{notificacion.mensaje}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatearFecha(notificacion.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="backup">
          <div className="space-y-3">
            {notificaciones.filter(n => n.categoria === 'backup').map((notificacion) => (
              <Card key={notificacion.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Archive className="h-5 w-5 text-blue-500 mt-1" />
                      <div>
                        <h4 className="font-semibold">{notificacion.titulo}</h4>
                        <p className="text-sm text-muted-foreground">{notificacion.mensaje}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatearFecha(notificacion.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SistemaNotificaciones