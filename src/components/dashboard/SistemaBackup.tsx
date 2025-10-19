'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Database, 
  Download,
  Upload,
  Trash2,
  Shield,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  FileArchive
} from 'lucide-react'

type Backup = {
  id: string
  tipo: 'completo' | 'incremental' | 'configuracion'
  nombre: string
  tamaño: string
  created_at: string
  estado: 'completado' | 'en_proceso' | 'error'
  descripcion?: string
}

type EstadisticasBackup = {
  espacios: number
  vehiculos: number
  sesiones: number
  usuarios: number
  tamaño_estimado: string
  ultimo_backup: string
}

const SistemaBackup = () => {
  const [backups, setBackups] = useState<Backup[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasBackup | null>(null)
  const [loading, setLoading] = useState(false)
  const [configuracionBackup, setConfiguracionBackup] = useState<{
    tipo: 'completo' | 'incremental' | 'configuracion';
    incluir_datos: boolean;
    incluir_configuracion: boolean;
    incluir_usuarios: boolean;
    formato: 'json' | 'sql';
    compresion: boolean;
    descripcion: string;
  }>({
    tipo: 'completo',
    incluir_datos: true,
    incluir_configuracion: true,
    incluir_usuarios: false,
    formato: 'json',
    compresion: true,
    descripcion: ''
  })
  const [backupsProgramados, setBackupsProgramados] = useState<{
    automatico: boolean;
    frecuencia: string;
    hora: string;
    mantener: number;
  }>({
    automatico: true,
    frecuencia: 'diario',
    hora: '02:00',
    mantener: 30
  })

  const cargarBackups = async () => {
    try {
      const response = await fetch('/api/backup')
      if (!response.ok) throw new Error('Error cargando backups')
      
      const data = await response.json()
      setBackups(data.data || [])
      setEstadisticas(data.estadisticas)
    } catch (error) {
      console.error('Error:', error)
      alert('Error cargando lista de backups')
    }
  }

  const crearBackup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuracionBackup)
      })
      
      if (!response.ok) throw new Error('Error creando backup')
      
      const data = await response.json()
      
      // Actualizar lista de backups
      await cargarBackups()
      
      // Resetear formulario
      setConfiguracionBackup(prev => ({ ...prev, descripcion: '' }))
      
      alert(`Backup creado exitosamente: ${data.data.nombre}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error creando backup')
    } finally {
      setLoading(false)
    }
  }

  const restaurarBackup = async (backupId: string) => {
    const confirmar = window.confirm(
      '⚠️ ADVERTENCIA: Esta acción restaurará el sistema al estado del backup seleccionado. ' +
      'Se creará un punto de restauración automático antes de proceder. ¿Desea continuar?'
    )
    
    if (!confirmar) return

    setLoading(true)
    try {
      const response = await fetch('/api/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_id: backupId,
          confirmar: true,
          restaurar_configuracion: true,
          restaurar_datos: true
        })
      })
      
      if (!response.ok) throw new Error('Error restaurando backup')
      
      const data = await response.json()
      alert(`Restauración completada exitosamente. Punto de restauración: ${data.punto_restauracion.id}`)
      
      // Recargar datos
      await cargarBackups()
    } catch (error) {
      console.error('Error:', error)
      alert('Error restaurando backup')
    } finally {
      setLoading(false)
    }
  }

  const eliminarBackup = async (backupId: string, nombre: string) => {
    const confirmar = window.confirm(`¿Está seguro de eliminar el backup "${nombre}"? Esta acción no se puede deshacer.`)
    
    if (!confirmar) return

    try {
      const response = await fetch(`/api/backup?id=${backupId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Error eliminando backup')
      
      await cargarBackups()
      alert('Backup eliminado exitosamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error eliminando backup')
    }
  }

  const descargarBackup = (backup: Backup) => {
    // Simular descarga
    alert(`Descargando ${backup.nombre}...`)
  }

  useEffect(() => {
    cargarBackups()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Respaldo</h1>
          <p className="text-muted-foreground">Gestión automática de backups y restauración</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarBackups}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={crearBackup} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Crear Backup
          </Button>
        </div>
      </div>

      {/* Estadísticas del sistema */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Espacios</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.espacios}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehículos</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.vehiculos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesiones</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.sesiones}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tamaño Estimado</CardTitle>
              <FileArchive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.tamaño_estimado}</div>
              <p className="text-xs text-muted-foreground">
                Último: {new Date(estadisticas.ultimo_backup).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Backup Manual</TabsTrigger>
          <TabsTrigger value="programados">Backups Programados</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Backup
              </CardTitle>
              <CardDescription>
                Configure las opciones para crear un nuevo backup del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Backup</Label>
                  <Select 
                    value={configuracionBackup.tipo} 
                    onValueChange={(value: 'completo' | 'incremental' | 'configuracion') => 
                      setConfiguracionBackup(prev => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completo">Completo</SelectItem>
                      <SelectItem value="incremental">Incremental</SelectItem>
                      <SelectItem value="configuracion">Solo Configuración</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formato">Formato</Label>
                  <Select 
                    value={configuracionBackup.formato} 
                    onValueChange={(value: 'json' | 'sql') => 
                      setConfiguracionBackup(prev => ({ ...prev, formato: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="incluir_datos"
                    checked={configuracionBackup.incluir_datos}
                    onCheckedChange={(checked) => 
                      setConfiguracionBackup(prev => ({ ...prev, incluir_datos: checked }))
                    }
                  />
                  <Label htmlFor="incluir_datos">Incluir datos de operación</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="incluir_configuracion"
                    checked={configuracionBackup.incluir_configuracion}
                    onCheckedChange={(checked) => 
                      setConfiguracionBackup(prev => ({ ...prev, incluir_configuracion: checked }))
                    }
                  />
                  <Label htmlFor="incluir_configuracion">Incluir configuración</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="incluir_usuarios"
                    checked={configuracionBackup.incluir_usuarios}
                    onCheckedChange={(checked) => 
                      setConfiguracionBackup(prev => ({ ...prev, incluir_usuarios: checked }))
                    }
                  />
                  <Label htmlFor="incluir_usuarios">Incluir usuarios</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="compresion"
                    checked={configuracionBackup.compresion}
                    onCheckedChange={(checked) => 
                      setConfiguracionBackup(prev => ({ ...prev, compresion: checked }))
                    }
                  />
                  <Label htmlFor="compresion">Comprimir archivo</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción del backup..."
                  value={configuracionBackup.descripcion}
                  onChange={(e) => 
                    setConfiguracionBackup(prev => ({ ...prev, descripcion: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Backups Automáticos
              </CardTitle>
              <CardDescription>
                Configure backups automáticos programados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="automatico"
                  checked={backupsProgramados.automatico}
                  onCheckedChange={(checked) => 
                    setBackupsProgramados(prev => ({ ...prev, automatico: checked }))
                  }
                />
                <Label htmlFor="automatico">Habilitar backups automáticos</Label>
              </div>

              {backupsProgramados.automatico && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frecuencia">Frecuencia</Label>
                    <Select 
                      value={backupsProgramados.frecuencia} 
                      onValueChange={(value) => 
                        setBackupsProgramados(prev => ({ ...prev, frecuencia: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diario</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora">Hora de ejecución</Label>
                    <Select 
                      value={backupsProgramados.hora} 
                      onValueChange={(value) => 
                        setBackupsProgramados(prev => ({ ...prev, hora: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="00:00">00:00</SelectItem>
                        <SelectItem value="02:00">02:00</SelectItem>
                        <SelectItem value="04:00">04:00</SelectItem>
                        <SelectItem value="06:00">06:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mantener">Mantener (días)</Label>
                    <Select 
                      value={backupsProgramados.mantener.toString()} 
                      onValueChange={(value) => 
                        setBackupsProgramados(prev => ({ ...prev, mantener: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                        <SelectItem value="365">1 año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Información</AlertTitle>
                <AlertDescription>
                  Los backups automáticos se ejecutarán usando las mismas configuraciones que el último backup manual creado.
                  Próximo backup programado: Mañana a las {backupsProgramados.hora}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Historial de Backups
              </CardTitle>
              <CardDescription>
                Lista de todos los backups creados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay backups disponibles
                  </div>
                ) : (
                  backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{backup.nombre}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(backup.created_at).toLocaleString()} • {backup.tamaño}
                          </div>
                          {backup.descripcion && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {backup.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={backup.tipo === 'completo' ? 'default' : 'secondary'}>
                          {backup.tipo}
                        </Badge>
                        <Badge variant={backup.estado === 'completado' ? 'default' : 'destructive'}>
                          {backup.estado === 'completado' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {backup.estado}
                        </Badge>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => descargarBackup(backup)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restaurarBackup(backup.id)}
                            disabled={backup.estado !== 'completado'}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => eliminarBackup(backup.id, backup.nombre)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SistemaBackup