import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Tipos
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

// Simulación de base de datos en memoria para desarrollo
const notificaciones: Notificacion[] = [
  {
    id: '1',
    tipo: 'success',
    titulo: 'Sistema iniciado correctamente',
    mensaje: 'El sistema de cochera está funcionando correctamente',
    es_global: true,
    prioridad: 'media',
    categoria: 'sistema',
    leida: false,
    archivada: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    tipo: 'info',
    titulo: 'Backup programado',
    mensaje: 'El próximo backup automático está programado para las 02:00',
    es_global: true,
    prioridad: 'baja',
    categoria: 'backup',
    leida: false,
    archivada: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

let nextId = 3

const createNotificacionSchema = z.object({
  tipo: z.enum(['info', 'warning', 'error', 'success']),
  titulo: z.string().min(1).max(100),
  mensaje: z.string().min(1).max(500),
  usuario_id: z.string().optional(),
  es_global: z.boolean().default(false),
  accion_url: z.string().optional(),
  accion_texto: z.string().max(50).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  categoria: z.enum(['sistema', 'backup', 'vehiculo', 'pago', 'usuario', 'mantenimiento']).default('sistema'),
  expira_en: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

const updateNotificacionSchema = z.object({
  leida: z.boolean().optional(),
  archivada: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parámetros de consulta
    const usuario_id = searchParams.get('usuario_id')
    const tipo = searchParams.get('tipo')
    const categoria = searchParams.get('categoria')
    const solo_no_leidas = searchParams.get('solo_no_leidas') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    let filteredNotifications = [...notificaciones]

    // Filtros
    if (usuario_id) {
      filteredNotifications = filteredNotifications.filter(n => 
        n.usuario_id === usuario_id || n.es_global
      )
    }
    if (tipo) {
      filteredNotifications = filteredNotifications.filter(n => n.tipo === tipo)
    }
    if (categoria) {
      filteredNotifications = filteredNotifications.filter(n => n.categoria === categoria)
    }
    if (solo_no_leidas) {
      filteredNotifications = filteredNotifications.filter(n => !n.leida)
    }

    // Paginación
    const total = filteredNotifications.length
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedNotifications = filteredNotifications.slice(from, to)

    // Estadísticas
    const estadisticas = {
      total,
      no_leidas: filteredNotifications.filter(n => !n.leida).length,
      por_tipo: {
        info: filteredNotifications.filter(n => n.tipo === 'info').length,
        warning: filteredNotifications.filter(n => n.tipo === 'warning').length,
        error: filteredNotifications.filter(n => n.tipo === 'error').length,
        success: filteredNotifications.filter(n => n.tipo === 'success').length
      },
      por_prioridad: {
        baja: filteredNotifications.filter(n => n.prioridad === 'baja').length,
        media: filteredNotifications.filter(n => n.prioridad === 'media').length,
        alta: filteredNotifications.filter(n => n.prioridad === 'alta').length,
        critica: filteredNotifications.filter(n => n.prioridad === 'critica').length
      }
    }

    return NextResponse.json({
      success: true,
      data: paginatedNotifications,
      estadisticas,
      paginacion: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createNotificacionSchema.parse(body)

    // Si la notificación expira, verificar que la fecha sea futura
    if (validatedData.expira_en) {
      const expiraEn = new Date(validatedData.expira_en)
      if (expiraEn <= new Date()) {
        return NextResponse.json(
          { error: 'La fecha de expiración debe ser futura' },
          { status: 400 }
        )
      }
    }

    const nuevaNotificacion: Notificacion = {
      id: (nextId++).toString(),
      ...validatedData,
      leida: false,
      archivada: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    notificaciones.unshift(nuevaNotificacion)

    return NextResponse.json({
      success: true,
      data: nuevaNotificacion,
      message: 'Notificación creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error en POST /api/notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de notificación requerido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateNotificacionSchema.parse(body)

    const notificationIndex = notificaciones.findIndex(n => n.id === id)
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    notificaciones[notificationIndex] = {
      ...notificaciones[notificationIndex],
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: notificaciones[notificationIndex],
      message: 'Notificación actualizada exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error en PATCH /api/notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const accion = searchParams.get('accion') // 'eliminar' o 'limpiar_leidas'
    
    if (accion === 'limpiar_leidas') {
      const usuario_id = searchParams.get('usuario_id')
      
      const initialLength = notificaciones.length
      const filteredNotifications = notificaciones.filter(n => {
        if (!n.leida || n.archivada) return true
        if (usuario_id) {
          return n.usuario_id !== usuario_id && !n.es_global
        }
        return false
      })

      notificaciones.length = 0
      notificaciones.push(...filteredNotifications)

      const deletedCount = initialLength - filteredNotifications.length

      return NextResponse.json({
        success: true,
        message: `${deletedCount} notificaciones leídas eliminadas exitosamente`
      })
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID de notificación requerido' },
        { status: 400 }
      )
    }

    const notificationIndex = notificaciones.findIndex(n => n.id === id)
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    notificaciones.splice(notificationIndex, 1)

    return NextResponse.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error en DELETE /api/notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}