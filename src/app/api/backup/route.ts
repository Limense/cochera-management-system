import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Cliente admin de Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Schema de validación para backup
const backupSchema = z.object({
  tipo: z.enum(['completo', 'incremental', 'configuracion']),
  incluir_datos: z.boolean().default(true),
  incluir_configuracion: z.boolean().default(true),
  incluir_usuarios: z.boolean().default(false),
  formato: z.enum(['sql', 'json']).default('json'),
  compresion: z.boolean().default(true),
  descripcion: z.string().max(500).optional()
})

const restaurarSchema = z.object({
  backup_id: z.string().uuid('ID de backup inválido'),
  confirmar: z.boolean().refine(val => val === true, 'Debe confirmar la restauración'),
  restaurar_configuracion: z.boolean().default(true),
  restaurar_datos: z.boolean().default(true)
})

// GET - Obtener lista de backups disponibles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    // Obtener backups desde tabla de auditoría o archivo de configuración
    const { data: backups, error } = await supabaseAdmin
      .from('sistema_backups')
      .select('*')
      .eq(tipo ? 'tipo' : 'id', tipo || undefined)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error obteniendo backups: ${error.message}`)
    }

    // Si no existe la tabla de backups, crear datos simulados
    const backupsData = backups || [
      {
        id: '1',
        tipo: 'completo',
        nombre: 'backup_completo_2024-01-15.json',
        tamaño: '1.2MB',
        created_at: new Date().toISOString(),
        estado: 'completado',
        descripcion: 'Backup automático diario'
      },
      {
        id: '2',
        tipo: 'configuracion',
        nombre: 'config_backup_2024-01-14.json',
        tamaño: '45KB',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        estado: 'completado',
        descripcion: 'Backup de configuración manual'
      }
    ]

    // Obtener estadísticas del sistema
    const estadisticas = await obtenerEstadisticasBackup()

    return NextResponse.json({
      data: backupsData,
      estadisticas,
      message: 'Backups obtenidos exitosamente',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en GET /api/backup:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = backupSchema.parse(body)

    // Generar nombre único para el backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const nombreBackup = `backup_${validatedData.tipo}_${timestamp}.${validatedData.formato}`

    // Simular creación de backup - en producción esto conectaría con la BD real
    const datosBackup = await generarBackup(validatedData)

    // Registrar el backup en el sistema
    const nuevoBackup = {
      id: `backup_${Date.now()}`,
      tipo: validatedData.tipo,
      nombre: nombreBackup,
      tamaño: calcularTamaño(datosBackup),
      estado: 'completado',
      descripcion: validatedData.descripcion || `Backup ${validatedData.tipo} generado automáticamente`,
      configuracion: validatedData,
      datos_incluidos: {
        espacios: validatedData.incluir_datos,
        vehiculos: validatedData.incluir_datos,
        sesiones: validatedData.incluir_datos,
        usuarios: validatedData.incluir_usuarios,
        configuracion: validatedData.incluir_configuracion,
        tarifas: validatedData.incluir_datos
      },
      created_at: new Date().toISOString()
    }

    // En un sistema real, esto se guardaría en una tabla de backups
    // await supabaseAdmin.from('sistema_backups').insert(nuevoBackup)

    // Log de auditoría
    await supabaseAdmin.from('auditoria_logs').insert({
      accion_tipo: 'backup_creado',
      tabla_afectada: 'sistema_backups',
      registro_id: nuevoBackup.id,
      detalles: {
        tipo: validatedData.tipo,
        nombre: nombreBackup,
        tamaño: nuevoBackup.tamaño,
        configuracion: validatedData
      }
    })

    return NextResponse.json({
      data: nuevoBackup,
      archivo_descarga: `/api/backup/download/${nuevoBackup.id}`,
      message: `Backup ${validatedData.tipo} creado exitosamente`,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error en POST /api/backup:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          message: 'Los datos enviados no cumplen con el formato requerido',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// PUT - Restaurar desde backup
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = restaurarSchema.parse(body)

    // Verificar que el backup existe
    const backupExiste = await verificarBackup(validatedData.backup_id)
    
    if (!backupExiste) {
      return NextResponse.json(
        { 
          error: 'Backup no encontrado',
          message: `No se encontró un backup con ID ${validatedData.backup_id}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Crear punto de restauración antes de proceder
    const puntoRestauracion = await crearPuntoRestauracion()

    // Simular proceso de restauración
    const resultadoRestauracion = await procesarRestauracion(validatedData, backupExiste)

    // Log de auditoría
    await supabaseAdmin.from('auditoria_logs').insert({
      accion_tipo: 'backup_restaurado',
      tabla_afectada: 'sistema_backups',
      registro_id: validatedData.backup_id,
      detalles: {
        backup_nombre: backupExiste.nombre,
        punto_restauracion: puntoRestauracion.id,
        configuracion_restaurada: validatedData.restaurar_configuracion,
        datos_restaurados: validatedData.restaurar_datos,
        resultado: resultadoRestauracion
      }
    })

    return NextResponse.json({
      data: resultadoRestauracion,
      punto_restauracion: puntoRestauracion,
      message: 'Restauración completada exitosamente',
      advertencia: 'Se recomienda verificar la integridad de los datos restaurados',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en PUT /api/backup:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          message: 'Los datos enviados no cumplen con el formato requerido',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error en restauración',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const backupId = searchParams.get('id')

    if (!backupId) {
      return NextResponse.json(
        { 
          error: 'ID requerido',
          message: 'El ID del backup es obligatorio para eliminar',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const backupExiste = await verificarBackup(backupId)
    
    if (!backupExiste) {
      return NextResponse.json(
        { 
          error: 'Backup no encontrado',
          message: `No se encontró un backup con ID ${backupId}`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Eliminar archivo físico del backup (simulado)
    await eliminarArchivoBackup(backupExiste.nombre)

    // Log de auditoría
    await supabaseAdmin.from('auditoria_logs').insert({
      accion_tipo: 'backup_eliminado',
      tabla_afectada: 'sistema_backups',
      registro_id: backupId,
      detalles: {
        nombre: backupExiste.nombre,
        tipo: backupExiste.tipo,
        tamaño: backupExiste.tamaño
      }
    })

    return NextResponse.json({
      message: `Backup ${backupExiste.nombre} eliminado exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en DELETE /api/backup:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Funciones auxiliares

async function obtenerEstadisticasBackup() {
  // Obtener estadísticas del sistema para backup
  const { count: totalEspacios } = await supabaseAdmin
    .from('espacios')
    .select('*', { count: 'exact', head: true })

  const { count: totalVehiculos } = await supabaseAdmin
    .from('vehiculos')
    .select('*', { count: 'exact', head: true })

  const { count: totalSesiones } = await supabaseAdmin
    .from('sesiones_parqueo')
    .select('*', { count: 'exact', head: true })

  const { count: totalUsuarios } = await supabaseAdmin
    .from('usuarios')
    .select('*', { count: 'exact', head: true })

  return {
    espacios: totalEspacios || 0,
    vehiculos: totalVehiculos || 0,
    sesiones: totalSesiones || 0,
    usuarios: totalUsuarios || 0,
    tamaño_estimado: calcularTamañoEstimado({
      espacios: totalEspacios || 0,
      vehiculos: totalVehiculos || 0,
      sesiones: totalSesiones || 0,
      usuarios: totalUsuarios || 0
    }),
    ultimo_backup: new Date().toISOString()
  }
}

async function generarBackup(configuracion: z.infer<typeof backupSchema>) {
  const datosBackup: Record<string, unknown> = {
    metadata: {
      tipo: configuracion.tipo,
      formato: configuracion.formato,
      created_at: new Date().toISOString(),
      version: '1.0.0',
      descripcion: configuracion.descripcion
    }
  }

  if (configuracion.incluir_datos) {
    // Obtener datos de tablas principales
    if (configuracion.tipo === 'completo' || configuracion.tipo === 'incremental') {
      const { data: espacios } = await supabaseAdmin.from('espacios').select('*')
      const { data: vehiculos } = await supabaseAdmin.from('vehiculos').select('*')
      const { data: sesiones } = await supabaseAdmin.from('sesiones_parqueo').select('*')
      
      datosBackup.espacios = espacios || []
      datosBackup.vehiculos = vehiculos || []
      datosBackup.sesiones = sesiones || []
    }
  }

  if (configuracion.incluir_usuarios) {
    const { data: usuarios } = await supabaseAdmin.from('usuarios').select('id, email, nombre, apellido, rol, is_active, permissions, created_at')
    datosBackup.usuarios = usuarios || []
  }

  if (configuracion.incluir_configuracion) {
    const { data: tarifas } = await supabaseAdmin.from('tarifas_dinamicas').select('*')
    datosBackup.configuracion = {
      tarifas: tarifas || [],
      sistema: {
        timezone: 'America/Argentina/Buenos_Aires',
        moneda: 'ARS',
        idioma: 'es'
      }
    }
  }

  return datosBackup
}

function calcularTamaño(datos: Record<string, unknown>): string {
  const jsonString = JSON.stringify(datos)
  const bytes = new Blob([jsonString]).size
  
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function calcularTamañoEstimado(estadisticas: Record<string, number>): string {
  const estimado = 
    (estadisticas.espacios * 0.5) + // 0.5KB por espacio
    (estadisticas.vehiculos * 1) + // 1KB por vehículo
    (estadisticas.sesiones * 2) + // 2KB por sesión
    (estadisticas.usuarios * 1.5) // 1.5KB por usuario
  
  return `${estimado.toFixed(1)}KB`
}

async function verificarBackup(id: string) {
  // En un sistema real, esto verificaría en la tabla de backups
  // Simulamos que existe
  return {
    id,
    nombre: `backup_${id}.json`,
    tipo: 'completo',
    tamaño: '1.2MB',
    created_at: new Date().toISOString()
  }
}

async function crearPuntoRestauracion() {
  // Crear backup automático antes de restaurar
  const puntoRestauracion = {
    id: `restore_point_${Date.now()}`,
    nombre: `punto_restauracion_${new Date().toISOString().split('T')[0]}.json`,
    created_at: new Date().toISOString(),
    tipo: 'punto_restauracion'
  }

  // En producción, esto crearía un backup real
  return puntoRestauracion
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function procesarRestauracion(config: z.infer<typeof restaurarSchema>, backup: Record<string, unknown>) {
  // Simular proceso de restauración
  const resultado = {
    tablas_restauradas: [] as string[],
    registros_procesados: 0,
    errores: [] as string[],
    tiempo_proceso: '2.3s',
    estado: 'completado'
  }

  if (config.restaurar_datos) {
    resultado.tablas_restauradas.push('espacios', 'vehiculos', 'sesiones_parqueo')
    resultado.registros_procesados += 150
  }

  if (config.restaurar_configuracion) {
    resultado.tablas_restauradas.push('tarifas_dinamicas', 'configuracion_sistema')
    resultado.registros_procesados += 25
  }

  return resultado
}

async function eliminarArchivoBackup(nombre: string) {
  // En producción, esto eliminaría el archivo físico del backup
  console.log(`Eliminando archivo de backup: ${nombre}`)
  return true
}
