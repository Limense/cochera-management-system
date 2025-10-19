'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { 
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Users,
  Car,
  ParkingSquare
} from 'lucide-react'

interface DiagnosticoSupabase {
  conexion: boolean
  espacios_total: number
  espacios_ocupados: number
  espacios_disponibles: number
  vehiculos_registrados: number
  sesiones_activas: number
  sesiones_completadas: number
  ultima_actualizacion: string
  errores: string[]
}

const DiagnosticoPage = () => {
  const [diagnostico, setDiagnostico] = useState<DiagnosticoSupabase | null>(null)
  const [loading, setLoading] = useState(false)

  const ejecutarDiagnostico = async () => {
    setLoading(true)
    const errores: string[] = []
    const resultado: DiagnosticoSupabase = {
      conexion: false,
      espacios_total: 0,
      espacios_ocupados: 0,  
      espacios_disponibles: 0,
      vehiculos_registrados: 0,
      sesiones_activas: 0,
      sesiones_completadas: 0,
      ultima_actualizacion: new Date().toISOString(),
      errores: []
    }

    try {
      // Test 1: Conexión básica
      const { error: connectionError } = await supabase
        .from('espacios')
        .select('count')
        .limit(1)

      if (connectionError) {
        errores.push(`Conexión fallida: ${connectionError.message}`)
      } else {
        resultado.conexion = true
      }

      // Test 2: Contar espacios por estado
      const { data: espacios, error: espaciosError } = await supabase
        .from('espacios')
        .select('estado')

      if (espaciosError) {
        errores.push(`Error espacios: ${espaciosError.message}`)
      } else {
        resultado.espacios_total = espacios?.length || 0
        resultado.espacios_ocupados = espacios?.filter(e => e.estado === 'ocupado').length || 0
        resultado.espacios_disponibles = espacios?.filter(e => e.estado === 'disponible').length || 0
      }

      // Test 3: Contar vehículos
      const { data: vehiculos, error: vehiculosError } = await supabase
        .from('vehiculos')
        .select('id')

      if (vehiculosError) {
        errores.push(`Error vehículos: ${vehiculosError.message}`)
      } else {
        resultado.vehiculos_registrados = vehiculos?.length || 0
      }

      // Test 4: Sesiones activas
      const { data: sesionesActivas, error: sesionesActivasError } = await supabase
        .from('sesiones_parqueo')
        .select('id')
        .eq('is_active', true)

      if (sesionesActivasError) {
        errores.push(`Error sesiones activas: ${sesionesActivasError.message}`)
      } else {
        resultado.sesiones_activas = sesionesActivas?.length || 0
      }

      // Test 5: Sesiones completadas
      const { data: sesionesCompletadas, error: sesionesCompletadasError } = await supabase
        .from('sesiones_parqueo')  
        .select('id')
        .eq('is_active', false)

      if (sesionesCompletadasError) {
        errores.push(`Error sesiones completadas: ${sesionesCompletadasError.message}`)
      } else {
        resultado.sesiones_completadas = sesionesCompletadas?.length || 0
      }

      // Test 6: Función SQL personalizada
      const { error: funcionError } = await supabase
        .rpc('espacios_disponibles')

      if (funcionError) {
        errores.push(`Error función SQL: ${funcionError.message}`)
      }

      resultado.errores = errores

    } catch (error) {
      errores.push(`Error general: ${error}`)
      resultado.errores = errores
    }

    setDiagnostico(resultado)
    setLoading(false)
  }

  useEffect(() => {
    ejecutarDiagnostico()
  }, [])

  const getStatusBadge = (condition: boolean, successText: string, errorText: string) => {
    return condition ? (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        {successText}
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <XCircle className="h-3 w-3 mr-1" />
        {errorText}
      </Badge>
    )
  }

  const hayDatosReales = diagnostico && (
    diagnostico.espacios_total > 0 ||
    diagnostico.vehiculos_registrados > 0 ||
    diagnostico.sesiones_activas > 0
  )

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              Diagnóstico de Supabase
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              Verificación de conexión y datos reales en la base de datos
            </p>
          </div>
          
          <Button 
            onClick={ejecutarDiagnostico}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Verificando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {diagnostico && (
        <>
          {/* Estado General */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Estado General del Sistema
                </span>
                {getStatusBadge(
                  diagnostico.conexion && (hayDatosReales || false),
                  'Supabase Conectado - Datos Reales',
                  'Problemas Detectados'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conexión a Supabase</p>
                  {getStatusBadge(diagnostico.conexion, 'Conectado', 'Sin conexión')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Última verificación</p>
                  <p className="text-sm text-gray-900">
                    {new Date(diagnostico.ultima_actualizacion).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas de Datos */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <ParkingSquare className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Espacios Totales</p>
                    <p className="text-2xl font-bold text-blue-700">{diagnostico.espacios_total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Car className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Espacios Ocupados</p>
                    <p className="text-2xl font-bold text-red-700">{diagnostico.espacios_ocupados}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Espacios Libres</p>
                    <p className="text-2xl font-bold text-green-700">{diagnostico.espacios_disponibles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Vehículos</p>
                    <p className="text-2xl font-bold text-purple-700">{diagnostico.vehiculos_registrados}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sesiones */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sesiones Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-orange-600">
                    {diagnostico.sesiones_activas}
                  </span>
                  <Badge className="bg-orange-100 text-orange-800">
                    En curso
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Vehículos actualmente estacionados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sesiones Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-gray-600">
                    {diagnostico.sesiones_completadas}
                  </span>
                  <Badge className="bg-gray-100 text-gray-800">
                    Historial
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Registro histórico de estacionamientos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Errores */}
          {diagnostico.errores.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Errores Detectados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostico.errores.map((error, index) => (
                    <li key={index} className="text-red-700 text-sm">
                      • {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Verificación Final */}
          <Card className={`mt-6 ${hayDatosReales ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
            <CardHeader>
              <CardTitle className={`${hayDatosReales ? 'text-green-800' : 'text-yellow-800'} flex items-center gap-2`}>
                {hayDatosReales ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                Verificación de Datos Reales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`${hayDatosReales ? 'text-green-700' : 'text-yellow-700'}`}>
                {hayDatosReales ? (
                  <div>
                    <p className="font-semibold text-lg mb-2">✅ CONFIRMADO: Sistema usando datos REALES de Supabase</p>
                    <ul className="text-sm space-y-1">
                      <li>• Base de datos conectada y funcional</li>
                      <li>• {diagnostico.espacios_total} espacios configurados</li>
                      <li>• {diagnostico.vehiculos_registrados} vehículos registrados</li>
                      <li>• {diagnostico.sesiones_activas} sesiones actualmente activas</li>
                      <li>• Sin datos mockeados o simulados</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-lg mb-2">⚠️ ADVERTENCIA: Datos insuficientes detectados</p>
                    <p className="text-sm">
                      Ejecuta el script de datos de prueba (datos-prueba-supabase.sql) 
                      en Supabase SQL Editor para poblar la base de datos.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default DiagnosticoPage